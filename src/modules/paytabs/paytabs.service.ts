import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios, { AxiosError } from 'axios';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
  PaymentType,
} from './schemas/paytabs.schema';
import {
  Currency,
  CurrencyDocument,
} from '../currency/schemas/currency.schema';
import {
  WalletDepositOrder,
  WalletDepositOrderDocument,
} from '../wallet/schemas/wallet-deposit-order.schema';
import {
  CreatePaymentDto,
  PaymentResponseDto,
  PayTabsWebhookDto,
  CustomerDetailsInputDto,
  EstimatePaymentDto,
  EstimatePaymentResponseDto,
} from './dto/paytabs.dto';
import { I18nService } from 'nestjs-i18n';
import { WalletService } from '../wallet/wallet.service';

interface PayTabsPaymentResult {
  response_code?: string;
  response_message?: string;
  response_status?: string;
  transaction_time?: string;
}

interface PayTabsPaymentInfo {
  payment_method?: string;
  card_type?: string;
  card_scheme?: string;
  card_first6?: string;
  card_last4?: string;
  expiryMonth?: string;
  expiryYear?: string;
  payment_description?: string;
}

interface PayTabsTransactionDetails {
  payment_result?: PayTabsPaymentResult;
  payment_info?: PayTabsPaymentInfo;
  response_code?: string;
  response_status?: string;
  trace?: string;
  serviceId?: string;
  merchantId?: string;
  profileId?: string;
  paymentChannel?: string;
}

interface PayTabsFeeStructure {
  enabled?: boolean;
  type?: string;
  percentage?: number;
  fixedAmount?: number;
}

@Injectable()
export class PayTabsService {
  private readonly logger = new Logger(PayTabsService.name);
  private readonly profileId: string;
  private readonly serverKey: string;
  private readonly region: string;
  private readonly callbackUrl: string;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Currency.name) private currencyModel: Model<CurrencyDocument>,
    @InjectModel(WalletDepositOrder.name)
    private walletDepositOrderModel: Model<WalletDepositOrderDocument>,
    private configService: ConfigService,
    private readonly i18n: I18nService,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
  ) {
    this.profileId = this.configService.get<string>('paytabs.profileId') || '';
    this.serverKey = this.configService.get<string>('paytabs.serverKey') || '';
    this.region = this.configService.get<string>('paytabs.region') || 'SAU';
    this.callbackUrl =
      this.configService.get<string>('paytabs.callbackUrl') || '';
  }

  private getPayTabsUrl(): string {
    const regionUrls: Record<string, string> = {
      ARE: 'https://secure.paytabs.com/',
      SAU: 'https://secure.paytabs.sa/',
      OMN: 'https://secure-oman.paytabs.com/',
      JOR: 'https://secure-jordan.paytabs.com/',
      EGY: 'https://secure-egypt.paytabs.com/',
      KWT: 'https://secure-kuwait.paytabs.com/',
      GLOBAL: 'https://secure-global.paytabs.com/',
    };

    return regionUrls[this.region] || regionUrls.SAU;
  }

  async createPayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Creating payment for order ${createPaymentDto.orderId}`);

    // Validate currency and check if PayTabs is enabled
    if (!Types.ObjectId.isValid(createPaymentDto.currencyId)) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }
    const currency = await this.currencyModel.findOne({
      _id: new Types.ObjectId(createPaymentDto.currencyId),
      deletedAt: null,
    });
    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }

    const cur = currency as CurrencyDocument;
    if (!cur.paytab?.paytabEnabled) {
      throw new BadRequestException(
        this.i18n.t('common.errors.paytabs_not_enabled', {
          args: { symbol: cur.symbol },
        }),
      );
    }

    // Calculate fees if enabled
    let totalAmount = createPaymentDto.amount;
    if (cur.paytab.paytabFees?.enabled) {
      const fees = this.calculateFees(
        createPaymentDto.amount,
        cur.paytab.paytabFees as PayTabsFeeStructure,
      );
      totalAmount += fees;
      this.logger.log(`Calculated fees: ${fees}, Total amount: ${totalAmount}`);
    }

    // Calculate taxes if enabled (same handling as fees)
    if (cur.paytab.paytabTax?.enabled) {
      const tax = this.calculateFees(
        createPaymentDto.amount,
        cur.paytab.paytabTax as PayTabsFeeStructure,
      );
      totalAmount += tax;
      this.logger.log(`Calculated tax: ${tax}, Total amount: ${totalAmount}`);
    }

    // Check for existing payment
    const existingPayment = await this.paymentModel.findOne({
      orderId: createPaymentDto.orderId,
      orderType: createPaymentDto.orderType,
    });

    if (
      existingPayment &&
      existingPayment.paymentStatus !== PaymentStatus.FAILED
    ) {
      throw new BadRequestException(
        this.i18n.t('common.errors.payment_already_exists'),
      );
    }

    // Create payment page with PayTabs
    try {
      const customerDetails: CustomerDetailsInputDto =
        createPaymentDto.customerDetails;

      const paymentPageData = {
        profile_id: this.profileId,
        tran_type: 'sale',
        tran_class: 'ecom',
        cart_id: `${createPaymentDto.orderType}|${createPaymentDto.orderId}`,
        cart_currency: currency.symbol,
        cart_amount: totalAmount,
        cart_description: createPaymentDto.orderType,
        paypage_lang: customerDetails.lang || 'ar',
        customer_details: {
          name: customerDetails.name,
          email: customerDetails.email,
          phone: customerDetails.phone,
          street1: customerDetails.street1 || 'N/A',
          city: customerDetails.city || 'N/A',
          state: customerDetails.state || 'N/A',
          country: this.region,
          zip: customerDetails.zip || '00000',
          ip: customerDetails.ip || '127.0.0.1',
        },
        shipping_details: {
          name: customerDetails.name,
          email: customerDetails.email,
          phone: customerDetails.phone,
          street1: customerDetails.street1 || 'N/A',
          city: customerDetails.city || 'N/A',
          state: customerDetails.state || 'N/A',
          country: this.region,
          zip: customerDetails.zip || '00000',
        },
        callback: this.callbackUrl,
        return: createPaymentDto.returnUrl || this.callbackUrl,
        hide_shipping: true,
        payment_methods: ['all'],
        framed: false,
      };

      const url = `${this.getPayTabsUrl()}payment/request`;
      this.logger.log(`Sending payment request to PayTabs: ${url}`);

      const response = await axios.post<PaymentResponseDto>(
        url,
        paymentPageData,
        {
          headers: {
            Authorization: this.serverKey,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`PayTabs response received: ${response.data.tran_ref}`);

      // Save or update payment record
      const paymentData = {
        orderId: createPaymentDto.orderId,
        orderType: createPaymentDto.orderType as PaymentType,
        userId: new Types.ObjectId(userId),
        currencyId: currency._id,
        amount: totalAmount,
        currency: currency.symbol,
        paymentStatus: PaymentStatus.PENDING,
        paymentLink: response.data.redirect_url,
        transactionId: response.data.tran_ref,
        paymentDescription: createPaymentDto.orderType,
      };

      if (existingPayment) {
        await this.paymentModel.findByIdAndUpdate(
          existingPayment._id,
          paymentData,
        );
        // Update WalletDepositOrder with payment ID for WALLET_DEPOSIT
        if (createPaymentDto.orderType === PaymentType.WALLET_DEPOSIT) {
          await this.walletDepositOrderModel.updateOne(
            { orderId: createPaymentDto.orderId },
            { paymentId: existingPayment._id },
          );
        }
      } else {
        const createdPayment = await this.paymentModel.create(paymentData);
        // Update WalletDepositOrder with payment ID for WALLET_DEPOSIT
        if (createPaymentDto.orderType === PaymentType.WALLET_DEPOSIT) {
          await this.walletDepositOrderModel.updateOne(
            { orderId: createPaymentDto.orderId },
            { paymentId: createdPayment._id },
          );
        }
      }

      return {
        tran_ref: response.data.tran_ref,
        redirect_url: response.data.redirect_url,
        payment_url: response.data.redirect_url,
        cart_id: response.data.cart_id,
        tran_type: response.data.tran_type,
        cart_amount: response.data.cart_amount,
        cart_currency: response.data.cart_currency,
      };
    } catch (error) {
      this.logger.error(`PayTabs payment creation failed: ${error}`);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;
        const apiMessage = axiosError.response?.data?.message;
        const statusText = axiosError.response?.statusText;
        const errorMessage =
          (typeof apiMessage === 'string' ? apiMessage : statusText) ||
          this.i18n.t('common.errors.payment_gateway_error');
        throw new BadRequestException(errorMessage);
      }

      throw new BadRequestException(
        this.i18n.t('common.errors.payment_creation_failed'),
      );
    }
  }

  async estimateCharges(
    estimateDto: EstimatePaymentDto,
  ): Promise<EstimatePaymentResponseDto> {
    const { currencyId, amount } = estimateDto as {
      currencyId: string;
      amount: number;
    };

    if (!Types.ObjectId.isValid(currencyId)) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }
    const currency = await this.currencyModel.findOne({
      _id: new Types.ObjectId(currencyId),
      deletedAt: null,
    });
    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }

    const cur = currency as CurrencyDocument;
    if (!cur.paytab?.paytabEnabled) {
      throw new BadRequestException(
        this.i18n.t('common.errors.paytabs_not_enabled', {
          args: { symbol: cur.symbol },
        }),
      );
    }

    const baseAmount: number = amount;
    const feesAmount: number = cur.paytab.paytabFees?.enabled
      ? this.calculateFees(baseAmount, cur.paytab.paytabFees)
      : 0;
    const taxAmount: number = cur.paytab.paytabTax?.enabled
      ? this.calculateFees(baseAmount, cur.paytab.paytabTax)
      : 0;
    const finalAmount: number = baseAmount + feesAmount + taxAmount;

    return {
      currency: cur.symbol,
      baseAmount,
      feesAmount,
      taxAmount,
      finalAmount,
      feeType: cur.paytab.paytabFees?.type,
      taxType: cur.paytab.paytabTax?.type,
    };
  }

  private calculateFees(amount: number, fees: PayTabsFeeStructure): number {
    let totalFees = 0;
    if (!fees?.enabled) {
      return totalFees;
    }
    if (fees.type === 'percentage' || fees.type === 'hybrid') {
      totalFees += (amount * (fees.percentage || 0)) / 100;
    }

    if (fees.type === 'fixed' || fees.type === 'hybrid') {
      totalFees += fees.fixedAmount || 0;
    }

    return totalFees;
  }

  async handleWebhook(
    webhookData: PayTabsWebhookDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Processing webhook for transaction: ${webhookData.tran_ref}`,
    );

    try {
      // Parse cart_id to get order type and ID
      const [orderType, orderId] = webhookData.cart_id.split('|');

      if (!orderType || !orderId) {
        throw new BadRequestException(
          this.i18n.t('common.errors.invalid_cart_id_format'),
        );
      }

      // Get transaction details from PayTabs
      const transactionDetails: PayTabsTransactionDetails =
        await this.getTransactionDetails(webhookData.tran_ref);

      // Determine payment status
      const isSuccessful = this.isPaymentSuccessful(transactionDetails);
      let paymentStatus = isSuccessful
        ? PaymentStatus.SUCCESS
        : PaymentStatus.FAILED;

      this.logger.log(
        `Payment status determined: ${paymentStatus} for transaction ${webhookData.tran_ref}`,
      );

      // Handle wallet deposit via PayTabs
      if (orderType === 'WALLET_DEPOSIT' && isSuccessful) {
        try {
          this.logger.log(
            `Initiating wallet deposit processing for transaction ${webhookData.tran_ref}`,
          );

          // Process the deposit (credits wallet and marks WalletDepositOrder as processed)
          await this.walletService.processDepositFromWebhook(
            webhookData.tran_ref,
          );

          this.logger.log(
            `Wallet deposit processed successfully for transaction ${webhookData.tran_ref}`,
          );
        } catch (depositError) {
          this.logger.error(
            `Failed to process wallet deposit for transaction ${webhookData.tran_ref}:`,
            depositError instanceof Error
              ? depositError.stack
              : String(depositError),
          );

          // Log detailed error information
          this.logger.error({
            transaction: webhookData.tran_ref,
            orderId,
            orderType,
            errorMessage:
              depositError instanceof Error
                ? depositError.message
                : String(depositError),
            errorType:
              depositError instanceof Error
                ? depositError.constructor.name
                : typeof depositError,
          });

          // Continue to update payment record even if wallet processing fails
          // Payment webhook should return success to PayTabs to prevent retries
          // But mark payment status as FAILED to enable manual intervention
          paymentStatus = PaymentStatus.FAILED;
        }
      }

      // Prepare update data for Payment record
      const paymentUpdateData = {
        paymentStatus,
        transactionId: webhookData.tran_ref,
        code:
          transactionDetails.payment_result?.response_code ||
          webhookData.response_code,
        responseMessage:
          transactionDetails.payment_result?.response_message ||
          webhookData.response_message,
        responseStatus:
          transactionDetails.payment_result?.response_status ||
          webhookData.response_status,
        paymentMethod:
          transactionDetails.payment_info?.payment_method ||
          webhookData.payment_info?.payment_method,
        cardType:
          transactionDetails.payment_info?.card_type ||
          webhookData.payment_info?.card_type,
        cardScheme:
          transactionDetails.payment_info?.card_scheme ||
          webhookData.payment_info?.card_scheme,
        cardFirst6:
          transactionDetails.payment_info?.card_first6 ||
          webhookData.payment_info?.card_first6,
        cardLast4:
          transactionDetails.payment_info?.card_last4 ||
          webhookData.payment_info?.card_last4,
        expiryMonth:
          transactionDetails.payment_info?.expiryMonth ||
          webhookData.payment_info?.expiryMonth,
        expiryYear:
          transactionDetails.payment_info?.expiryYear ||
          webhookData.payment_info?.expiryYear,
        paymentDescription:
          transactionDetails.payment_info?.payment_description ||
          webhookData.payment_info?.payment_description,
        transactionTime: transactionDetails.payment_result?.transaction_time
          ? new Date(transactionDetails.payment_result.transaction_time)
          : undefined,
        trace: transactionDetails.trace || webhookData.trace,
        serviceId: transactionDetails.serviceId
          ? parseInt(transactionDetails.serviceId, 10)
          : webhookData.serviceId,
        merchantId: transactionDetails.merchantId
          ? parseInt(transactionDetails.merchantId, 10)
          : webhookData.merchantId,
        profileId: transactionDetails.profileId
          ? parseInt(transactionDetails.profileId, 10)
          : webhookData.profileId,
        paymentChannel:
          transactionDetails.paymentChannel || webhookData.paymentChannel,
      };

      // Update Payment record with webhook data
      const updatedPayment = await this.paymentModel.findOneAndUpdate(
        { orderId, orderType },
        paymentUpdateData,
        {
          new: true,
        },
      );

      if (!updatedPayment) {
        this.logger.warn(`No payment record found for order ${orderId}`);
      } else {
        this.logger.log(`Payment updated successfully for order ${orderId}`);
      }

      return {
        success: true,
        message: this.i18n.t('common.messages.payment_webhook_processed'),
      };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error}`);
      throw error;
    }
  }

  private async getTransactionDetails(
    tranRef: string,
  ): Promise<PayTabsTransactionDetails> {
    try {
      const url = `${this.getPayTabsUrl()}payment/query`;
      const response = await axios.post(
        url,
        {
          profile_id: this.profileId,
          tran_ref: tranRef,
        },
        {
          headers: {
            Authorization: this.serverKey,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data as PayTabsTransactionDetails;
    } catch (error) {
      this.logger.error(`Failed to get transaction details: ${error}`);
      throw new BadRequestException(
        this.i18n.t('common.errors.transaction_details_failed'),
      );
    }
  }

  private isPaymentSuccessful(
    transactionDetails: PayTabsTransactionDetails,
  ): boolean {
    const responseCode =
      transactionDetails.payment_result?.response_code ||
      transactionDetails.response_code ||
      '';
    const responseStatus =
      transactionDetails.payment_result?.response_status ||
      transactionDetails.response_status ||
      '';

    // PayTabs success codes
    const successCodes = ['100', '4012', '4000'];
    const successStatuses = ['A', 'APPROVED', 'SUCCESS'];

    const isSuccessful =
      successCodes.includes(responseCode) ||
      successStatuses.includes(responseStatus.toUpperCase());

    this.logger.log(
      `Payment success check: ${isSuccessful} (code: ${responseCode}, status: ${responseStatus})`,
    );

    return isSuccessful;
  }

  async getPaymentByOrder(
    orderId: string,
    orderType: string,
  ): Promise<Payment | null> {
    return this.paymentModel.findOne({ orderId, orderType, deletedAt: null });
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    return this.paymentModel
      .find({ userId, deletedAt: null })
      .sort({ createdAt: -1 });
  }
}
