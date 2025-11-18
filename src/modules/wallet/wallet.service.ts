import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';
import {
  Account,
  AccountDocument,
  AccountStatus,
  AccountType,
} from './schemas/account.schema';
import { Balance, BalanceDocument } from './schemas/balance.schema';
import {
  JournalEntry,
  JournalEntryDocument,
} from './schemas/journal-entry.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
} from './schemas/transaction.schema';
import {
  WalletDepositOrder,
  WalletDepositOrderDocument,
  DepositType,
} from './schemas/wallet-deposit-order.schema';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { DepositDto } from './dto/deposit.dto';
import { DepositViaPayTabsDto } from './dto/deposit-via-paytabs.dto';
import { RedisLockService } from '../../common/services/internal/redis-lock.service';
import { MongoService } from '../../common/services/internal/mongo.service';
import { WalletSubtype } from './dto/create-wallet.dto';
import {
  Currency,
  CurrencyDocument,
} from '../currency/schemas/currency.schema';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
  PaymentType,
} from '../paytabs/schemas/paytabs.schema';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PaymentResponseDto } from '../paytabs/dto/paytabs.dto';

interface PayTabsFeeStructure {
  enabled?: boolean;
  type?: string;
  percentage?: number;
  fixedAmount?: number;
}

@Injectable()
export class WalletService {
  private readonly profileId: string;
  private readonly serverKey: string;
  private readonly region: string;
  private readonly callbackUrl: string;

  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    @InjectModel(Balance.name) private balanceModel: Model<BalanceDocument>,
    @InjectModel(JournalEntry.name)
    private journalModel: Model<JournalEntryDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(WalletDepositOrder.name)
    private walletDepositOrderModel: Model<WalletDepositOrderDocument>,
    @InjectModel(Currency.name)
    private currencyModel: Model<CurrencyDocument>,
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
    private readonly mongo: MongoService,
    private readonly i18n: I18nService,
    private readonly lockService: RedisLockService,
    private readonly configService: ConfigService,
  ) {
    this.profileId = this.configService.get<string>('paytabs.profileId') || '';
    this.serverKey = this.configService.get<string>('paytabs.serverKey') || '';
    this.region = this.configService.get<string>('paytabs.region') || 'SAU';
    this.callbackUrl =
      this.configService.get<string>('paytabs.callbackUrl') || '';
  }

  async createWallet(dto: CreateWalletDto): Promise<Account> {
    const existing = await this.accountModel.findOne({
      type: AccountType.WALLET,
      userId: new Types.ObjectId(dto.userId),
      subtype: dto.subtype,
      deletedAt: null,
    });
    if (existing) {
      throw new ConflictException(this.i18n.t('common.errors.wallet_exists'));
    }
    const acc = new this.accountModel({
      type: AccountType.WALLET,
      userId: new Types.ObjectId(dto.userId),
      subtype: dto.subtype,
      name: dto.name ?? null,
      status: AccountStatus.ACTIVE,
    });
    return acc.save();
  }

  async ensureSystemTreasury(subtype = 'TREASURY'): Promise<AccountDocument> {
    const acc = await this.accountModel.findOne({
      type: AccountType.SYSTEM,
      userId: null,
      subtype,
      deletedAt: null,
    });
    if (acc) return acc;
    const created = new this.accountModel({
      type: AccountType.SYSTEM,
      userId: null,
      subtype,
      name: 'System Treasury',
      status: AccountStatus.ACTIVE,
    });
    return created.save();
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

  private async getAssetIdBySymbol(
    assetSymbol: string,
  ): Promise<Types.ObjectId> {
    // For now, only supporting currencies. Metals would require additional model injection.
    const currency = await this.currencyModel.findOne({
      symbol: assetSymbol,
      deletedAt: null,
    });
    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }
    return currency._id as Types.ObjectId;
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

  async getBalance(accountId: string, assetSymbol: string): Promise<Balance> {
    const bal = await this.balanceModel.findOne({
      accountId: new Types.ObjectId(accountId),
      assetSymbol,
    });
    if (!bal) {
      return new this.balanceModel({
        accountId: new Types.ObjectId(accountId),
        assetSymbol,
        available: 0,
        locked: 0,
      });
    }
    return bal;
  }

  async getBalanceForUser(
    accountId: string,
    userId: string,
    assetSymbol: string,
  ): Promise<Balance> {
    const acc = await this.accountModel.findOne({
      _id: accountId,
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    });
    if (!acc) {
      throw new NotFoundException(
        this.i18n.t('common.errors.wallet_not_found'),
      );
    }
    return this.getBalance(accountId, assetSymbol);
  }

  async listUserWallets(
    userId: string,
    subtype?: WalletSubtype,
  ): Promise<AccountDocument[]> {
    const filter: Record<string, unknown> = {
      type: AccountType.WALLET,
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    };
    if (subtype) filter['subtype'] = subtype;
    const wallets = await this.accountModel
      .find(filter)
      .sort({ createdAt: -1 })
      .exec();
    return wallets;
  }

  async listWalletsByUserAdmin(
    userId: string,
    subtype?: WalletSubtype,
  ): Promise<AccountDocument[]> {
    return this.listUserWallets(userId, subtype);
  }

  async depositViaPayTabs(
    dto: DepositViaPayTabsDto,
    userId: string,
    walletSubtype: WalletSubtype,
  ): Promise<PaymentResponseDto> {
    // Find user wallet by subtype
    const walletAcc = await this.accountModel.findOne({
      userId: new Types.ObjectId(userId),
      type: 'WALLET',
      subtype: walletSubtype,
      deletedAt: null,
    });
    if (!walletAcc) {
      throw new NotFoundException(
        this.i18n.t('common.errors.wallet_not_found'),
      );
    }

    // Validate currency and check if PayTabs is enabled
    if (!Types.ObjectId.isValid(dto.currencyId)) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }
    const currency = await this.currencyModel.findOne({
      _id: new Types.ObjectId(dto.currencyId),
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

    // Calculate fees and taxes
    const baseAmount = dto.amount;
    const feesAmount = cur.paytab.paytabFees?.enabled
      ? this.calculateFees(
          baseAmount,
          cur.paytab.paytabFees as PayTabsFeeStructure,
        )
      : 0;
    const taxAmount = cur.paytab.paytabTax?.enabled
      ? this.calculateFees(
          baseAmount,
          cur.paytab.paytabTax as PayTabsFeeStructure,
        )
      : 0;
    const totalAmount = baseAmount + feesAmount + taxAmount;

    // Create payment page with PayTabs
    try {
      const customerDetails = dto.customerDetails;
      const orderId = `DEPOSIT-${(walletAcc._id as Types.ObjectId).toHexString()}-${Date.now()}`;
      const orderType = 'WALLET_DEPOSIT';

      const paymentPageData = {
        profile_id: this.profileId,
        tran_type: 'sale',
        tran_class: 'ecom',
        cart_id: `${orderType}|${orderId}`,
        cart_currency: currency.symbol,
        cart_amount: totalAmount,
        cart_description: `Deposit to wallet ${(walletAcc._id as Types.ObjectId).toHexString()}`,
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
        return: dto.returnUrl || this.callbackUrl,
        hide_shipping: true,
        payment_methods: ['all'],
        framed: false,
      };

      const url = `${this.getPayTabsUrl()}payment/request`;
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

      // Create Payment record in database
      const payment = await this.paymentModel.create({
        orderId,
        orderType: PaymentType.WALLET_DEPOSIT as PaymentType,
        userId: new Types.ObjectId(userId),
        currencyId: currency._id,
        amount: totalAmount,
        currency: currency.symbol,
        paymentStatus: PaymentStatus.PENDING,
        paymentLink: response.data.redirect_url,
        transactionId: response.data.tran_ref,
        paymentDescription: 'Wallet deposit via PayTabs',
      });

      // Save initial deposit order with payment reference
      await new this.walletDepositOrderModel({
        orderId,
        depositType: DepositType.PAYTAB,
        paymentId: payment._id,
        bankDepositId: null,
        walletAccountId: walletAcc._id,
        userId: new Types.ObjectId(userId),
        baseAmount,
        feesAmount,
        taxAmount,
        assetSymbol: cur.symbol,
        assetId: currency._id,
        processed: false,
        journalEntryIds: [],
      }).save();

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
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | { message?: string }
          | undefined;
        const apiMessage = responseData?.message;
        const statusText = error.response?.statusText;
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

  async processDepositFromWebhook(tranRef: string): Promise<void> {
    // Find Payment by tranRef to get paymentId
    const payment = await this.paymentModel.findOne({
      transactionId: tranRef,
    });

    if (!payment) {
      return; // Payment not found
    }

    // Find deposit order by paymentId
    const depositOrder = await this.walletDepositOrderModel.findOne({
      paymentId: payment._id,
      processed: false,
    });

    if (!depositOrder) {
      return; // Already processed or not found
    }

    const idempotencyKey = `paytabs-deposit-${(payment._id as Types.ObjectId).toString()}`;

    // Check if already processed
    const existingJournal = await this.journalModel.findOne({
      idempotencyKey,
    });
    if (existingJournal) {
      const journals = await this.journalModel
        .find({
          idempotencyKey: {
            $in: [
              idempotencyKey,
              `${idempotencyKey}-fees`,
              `${idempotencyKey}-tax`,
            ],
          },
        })
        .select({ _id: 1 })
        .lean();

      const journalIds = journals.map((j) => j._id as Types.ObjectId);

      await this.walletDepositOrderModel.updateOne(
        { _id: depositOrder._id },
        { processed: true, journalEntryIds: journalIds },
      );
      return; // Already processed
    }

    const walletAccountId = depositOrder.walletAccountId.toHexString();
    const userId = depositOrder.userId.toHexString();
    const baseAmount = depositOrder.baseAmount;
    const feesAmount = depositOrder.feesAmount;
    const taxAmount = depositOrder.taxAmount;
    const assetSymbol = depositOrder.assetSymbol;

    const walletAcc = await this.accountModel.findOne({
      _id: walletAccountId,
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    });
    if (!walletAcc) {
      throw new NotFoundException(
        this.i18n.t('common.errors.wallet_not_found'),
      );
    }

    const systemFees = await this.ensureSystemTreasury('FEES');
    const systemTax = await this.ensureSystemTreasury('TAX');

    // Prepare lock keys
    const walletIdStr = (walletAcc._id as Types.ObjectId).toHexString();
    const feesIdStr = (systemFees._id as Types.ObjectId).toHexString();
    const taxIdStr = (systemTax._id as Types.ObjectId).toHexString();

    const lockKeys = [
      `wallet:${walletIdStr}:${assetSymbol}`,
      `wallet:${feesIdStr}:${assetSymbol}`,
      `wallet:${taxIdStr}:${assetSymbol}`,
    ].sort();

    const ttlMs = 10000;
    const tokens: Array<{ key: string; token: string }> = [];

    try {
      // Acquire all locks
      for (const key of lockKeys) {
        const token = await this.lockService.acquire(key, ttlMs);
        if (!token) {
          throw new ConflictException(
            this.i18n.t('common.errors.deposit_failed'),
          );
        }
        tokens.push({ key, token });
      }

      const session = await this.mongo.startSession();
      try {
        await session.withTransaction(async () => {
          const createdJournalIds: Types.ObjectId[] = [];
          // 1. Direct deposit to user wallet (no debit from treasury)
          if (baseAmount > 0) {
            const userBalBefore = await this.balanceModel.findOne({
              accountId: walletAcc._id,
              assetType: 'CURRENCY',
              assetId: depositOrder.assetId,
              assetSymbol,
            });
            const balanceBefore = userBalBefore?.available || 0;

            const userBal = await this.balanceModel.findOneAndUpdate(
              {
                accountId: walletAcc._id,
                assetType: 'CURRENCY',
                assetId: depositOrder.assetId,
                assetSymbol,
              },
              { $inc: { available: baseAmount } },
              { new: true, upsert: true, session },
            );

            const userTx = await new this.transactionModel({
              accountId: walletAcc._id,
              assetType: 'CURRENCY',
              assetId: depositOrder.assetId,
              balanceId: userBal._id,
              assetSymbol,
              type: TransactionType.DEPOSIT,
              amount: baseAmount,
              balanceBefore,
              balanceAfter: userBal.available,
              title: {
                en: 'Direct deposit via PayTabs',
                ar: 'إيداع مباشر عبر باي تابز',
              },
              journalEntryId: null,
            }).save({ session });

            // Journal entry without debitAccountId (direct external deposit)
            const journal1 = await new this.journalModel({
              creditAccountId: walletAcc._id,
              assetSymbol,
              assetType: 'CURRENCY',
              assetId: depositOrder.assetId,
              amount: baseAmount,
              transactionIds: [(userTx._id as Types.ObjectId).toHexString()],
              idempotencyKey,
            }).save({ session });

            await this.transactionModel.updateOne(
              { _id: userTx._id },
              { journalEntryId: journal1._id },
              { session },
            );
            createdJournalIds.push(journal1._id as Types.ObjectId);
          }

          // 2. Direct deposit of platform fees (if any)
          if (feesAmount > 0) {
            const feesBalBefore = await this.balanceModel.findOne({
              accountId: systemFees._id,
              assetType: 'CURRENCY',
              assetId: depositOrder.assetId,
              assetSymbol,
            });
            const feesBefore = feesBalBefore?.available || 0;

            const feesBal = await this.balanceModel.findOneAndUpdate(
              {
                accountId: systemFees._id,
                assetType: 'CURRENCY',
                assetId: depositOrder.assetId,
                assetSymbol,
              },
              { $inc: { available: feesAmount } },
              { new: true, upsert: true, session },
            );

            const feesTx = await new this.transactionModel({
              accountId: systemFees._id,
              assetType: 'CURRENCY',
              assetId: depositOrder.assetId,
              balanceId: feesBal._id,
              assetSymbol,
              type: TransactionType.DEPOSIT,
              amount: feesAmount,
              balanceBefore: feesBefore,
              balanceAfter: feesBal.available,
              title: {
                en: 'Platform fees from PayTabs deposit',
                ar: 'عمولة المنصة من إيداع باي تابز',
              },
              journalEntryId: null,
            }).save({ session });

            // Journal entry without debitAccountId (direct external fees)
            const journal2 = await new this.journalModel({
              creditAccountId: systemFees._id,
              assetSymbol,
              assetType: 'CURRENCY',
              assetId: depositOrder.assetId,
              amount: feesAmount,
              transactionIds: [(feesTx._id as Types.ObjectId).toHexString()],
              idempotencyKey: `${idempotencyKey}-fees`,
            }).save({ session });

            await this.transactionModel.updateOne(
              { _id: feesTx._id },
              { journalEntryId: journal2._id },
              { session },
            );
            createdJournalIds.push(journal2._id as Types.ObjectId);
          }

          // 3. Direct deposit of tax (if any)
          if (taxAmount > 0) {
            const taxBalBefore = await this.balanceModel.findOne({
              accountId: systemTax._id,
              assetType: 'CURRENCY',
              assetId: depositOrder.assetId,
              assetSymbol,
            });
            const taxBefore = taxBalBefore?.available || 0;

            const taxBal = await this.balanceModel.findOneAndUpdate(
              {
                accountId: systemTax._id,
                assetType: 'CURRENCY',
                assetId: depositOrder.assetId,
                assetSymbol,
              },
              { $inc: { available: taxAmount } },
              { new: true, upsert: true, session },
            );

            const taxTx = await new this.transactionModel({
              accountId: systemTax._id,
              assetType: 'CURRENCY',
              assetId: depositOrder.assetId,
              balanceId: taxBal._id,
              assetSymbol,
              type: TransactionType.DEPOSIT,
              amount: taxAmount,
              balanceBefore: taxBefore,
              balanceAfter: taxBal.available,
              title: {
                en: 'Tax from PayTabs deposit',
                ar: 'ضريبة من إيداع باي تابز',
              },
              journalEntryId: null,
            }).save({ session });

            // Journal entry without debitAccountId (direct external tax)
            const journal3 = await new this.journalModel({
              creditAccountId: systemTax._id,
              assetSymbol,
              assetType: 'CURRENCY',
              assetId: depositOrder.assetId,
              amount: taxAmount,
              transactionIds: [(taxTx._id as Types.ObjectId).toHexString()],
              idempotencyKey: `${idempotencyKey}-tax`,
            }).save({ session });

            await this.transactionModel.updateOne(
              { _id: taxTx._id },
              { journalEntryId: journal3._id },
              { session },
            );
            createdJournalIds.push(journal3._id as Types.ObjectId);
          }

          // Mark deposit order as processed and attach journal entries
          await this.walletDepositOrderModel.updateOne(
            { _id: depositOrder._id },
            { processed: true, journalEntryIds: createdJournalIds },
            { session },
          );
        });
      } finally {
        await session.endSession();
      }
    } finally {
      // Release all locks
      for (const { key, token } of tokens) {
        await this.lockService.release(key, token);
      }
    }
  }

  async deposit(
    dto: DepositDto,
  ): Promise<{ balance: Balance; journal: JournalEntry }> {
    const existingJournal = await this.journalModel.findOne({
      idempotencyKey: dto.idempotencyKey,
    });
    if (existingJournal) {
      const bal = await this.getBalance(dto.walletAccountId, dto.assetSymbol);
      return { balance: bal, journal: existingJournal };
    }

    // Get assetId from symbol
    const assetId = await this.getAssetIdBySymbol(dto.assetSymbol);

    const walletAcc = await this.accountModel.findOne({
      _id: dto.walletAccountId,
      deletedAt: null,
    });
    if (!walletAcc) {
      throw new NotFoundException(
        this.i18n.t('common.errors.wallet_not_found'),
      );
    }
    const sys = await this.ensureSystemTreasury();
    const walletIdStr =
      walletAcc._id instanceof Types.ObjectId
        ? walletAcc._id.toHexString()
        : String(walletAcc._id);
    const sysIdStr =
      sys._id instanceof Types.ObjectId
        ? sys._id.toHexString()
        : String(sys._id);
    const keyA = `wallet:${walletIdStr}:${dto.assetSymbol}`;
    const keyB = `wallet:${sysIdStr}:${dto.assetSymbol}`;
    const [firstKey, secondKey] = keyA < keyB ? [keyA, keyB] : [keyB, keyA];
    const ttlMs = 5000;
    const token1 = await this.lockService.acquire(firstKey, ttlMs);
    if (!token1)
      throw new ConflictException(this.i18n.t('common.errors.deposit_failed'));
    const token2 = await this.lockService.acquire(secondKey, ttlMs);
    if (!token2) {
      await this.lockService.release(firstKey, token1);
      throw new ConflictException(this.i18n.t('common.errors.deposit_failed'));
    }

    const session = await this.mongo.startSession();
    let result: { balance: Balance; journal: JournalEntry } | null = null;
    try {
      await session.withTransaction(async () => {
        // Get balance before for user wallet
        const userBalBefore = await this.balanceModel.findOne({
          accountId: walletAcc._id,
          assetType: 'CURRENCY',
          assetId,
          assetSymbol: dto.assetSymbol,
        });
        const balanceBefore = userBalBefore?.available || 0;

        const walletBal = await this.balanceModel.findOneAndUpdate(
          {
            accountId: walletAcc._id,
            assetType: 'CURRENCY',
            assetId,
            assetSymbol: dto.assetSymbol,
          },
          { $inc: { available: dto.amount } },
          { new: true, upsert: true, session },
        );

        // Create transaction for user wallet (deposit)
        const userTx = await new this.transactionModel({
          accountId: walletAcc._id,
          assetType: 'CURRENCY',
          assetId,
          balanceId: walletBal._id,
          assetSymbol: dto.assetSymbol,
          type: TransactionType.DEPOSIT,
          amount: dto.amount,
          balanceBefore,
          balanceAfter: walletBal.available,
          title: {
            en: 'Deposit',
            ar: 'إيداع',
          },
          journalEntryId: null,
        }).save({ session });

        await this.balanceModel.findOneAndUpdate(
          {
            accountId: sys._id,
            assetType: 'CURRENCY',
            assetId,
            assetSymbol: dto.assetSymbol,
          },
          { $inc: { available: -dto.amount } },
          { new: true, upsert: true, session },
        );

        // Create transaction for system treasury (withdrawal)
        const sysTx = await new this.transactionModel({
          accountId: sys._id,
          assetType: 'CURRENCY',
          assetId,
          balanceId: null, // System treasury transaction, no specific balance tracking
          assetSymbol: dto.assetSymbol,
          type: TransactionType.WITHDRAWAL,
          amount: dto.amount,
          balanceBefore: 0,
          balanceAfter: 0,
          title: {
            en: 'User deposit',
            ar: 'إيداع مستخدم',
          },
          journalEntryId: null,
        }).save({ session });

        const journal = await new this.journalModel({
          debitAccountId: sys._id,
          creditAccountId: walletAcc._id,
          assetSymbol: dto.assetSymbol,
          assetType: 'CURRENCY',
          assetId,
          amount: dto.amount,
          transactionIds: [
            (userTx._id as Types.ObjectId).toHexString(),
            (sysTx._id as Types.ObjectId).toHexString(),
          ],
          idempotencyKey: dto.idempotencyKey,
        }).save({ session });

        // Update transactions with journal entry ID
        await this.transactionModel.updateMany(
          { _id: { $in: [userTx._id, sysTx._id] } },
          { journalEntryId: journal._id },
          { session },
        );

        result = { balance: walletBal, journal };
      });
    } finally {
      await session.endSession();
      await this.lockService.release(firstKey, token1);
      await this.lockService.release(secondKey, token2);
    }
    if (!result) {
      throw new ConflictException(this.i18n.t('common.errors.deposit_failed'));
    }
    return result;
  }

  async depositForUser(
    dto: DepositDto,
    userId: string,
  ): Promise<{ balance: Balance; journal: JournalEntry }> {
    const existingJournal = await this.journalModel.findOne({
      idempotencyKey: dto.idempotencyKey,
    });
    if (existingJournal) {
      const bal = await this.getBalance(dto.walletAccountId, dto.assetSymbol);
      return { balance: bal, journal: existingJournal };
    }

    // Get assetId from symbol
    const assetId = await this.getAssetIdBySymbol(dto.assetSymbol);

    const walletAcc = await this.accountModel.findOne({
      _id: dto.walletAccountId,
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    });
    if (!walletAcc) {
      throw new NotFoundException(
        this.i18n.t('common.errors.wallet_not_found'),
      );
    }
    const sys = await this.ensureSystemTreasury();
    const walletIdStr =
      walletAcc._id instanceof Types.ObjectId
        ? walletAcc._id.toHexString()
        : String(walletAcc._id);
    const sysIdStr =
      sys._id instanceof Types.ObjectId
        ? sys._id.toHexString()
        : String(sys._id);
    const keyA = `wallet:${walletIdStr}:${dto.assetSymbol}`;
    const keyB = `wallet:${sysIdStr}:${dto.assetSymbol}`;
    const [firstKey, secondKey] = keyA < keyB ? [keyA, keyB] : [keyB, keyA];
    const ttlMs = 5000;
    const token1 = await this.lockService.acquire(firstKey, ttlMs);
    if (!token1)
      throw new ConflictException(this.i18n.t('common.errors.deposit_failed'));
    const token2 = await this.lockService.acquire(secondKey, ttlMs);
    if (!token2) {
      await this.lockService.release(firstKey, token1);
      throw new ConflictException(this.i18n.t('common.errors.deposit_failed'));
    }

    const session = await this.mongo.startSession();
    let result: { balance: Balance; journal: JournalEntry } | null = null;
    try {
      await session.withTransaction(async () => {
        // Get balance before for user wallet
        const userBalBefore = await this.balanceModel.findOne({
          accountId: walletAcc._id,
          assetType: 'CURRENCY',
          assetId,
          assetSymbol: dto.assetSymbol,
        });
        const balanceBefore = userBalBefore?.available || 0;

        const walletBal = await this.balanceModel.findOneAndUpdate(
          {
            accountId: walletAcc._id,
            assetType: 'CURRENCY',
            assetId,
            assetSymbol: dto.assetSymbol,
          },
          { $inc: { available: dto.amount } },
          { new: true, upsert: true, session },
        );

        // Create transaction for user wallet (deposit)
        const userTx = await new this.transactionModel({
          accountId: walletAcc._id,
          assetType: 'CURRENCY',
          assetId,
          balanceId: walletBal._id,
          assetSymbol: dto.assetSymbol,
          type: TransactionType.DEPOSIT,
          amount: dto.amount,
          balanceBefore,
          balanceAfter: walletBal.available,
          title: {
            en: 'Deposit',
            ar: 'إيداع',
          },
          journalEntryId: null,
        }).save({ session });

        await this.balanceModel.findOneAndUpdate(
          {
            accountId: sys._id,
            assetType: 'CURRENCY',
            assetId,
            assetSymbol: dto.assetSymbol,
          },
          { $inc: { available: -dto.amount } },
          { new: true, upsert: true, session },
        );

        // Create transaction for system treasury (withdrawal)
        const sysTx = await new this.transactionModel({
          accountId: sys._id,
          assetType: 'CURRENCY',
          assetId,
          balanceId: null, // System treasury transaction, no specific balance tracking
          assetSymbol: dto.assetSymbol,
          type: TransactionType.WITHDRAWAL,
          amount: dto.amount,
          balanceBefore: 0,
          balanceAfter: 0,
          title: {
            en: 'User deposit',
            ar: 'إيداع مستخدم',
          },
          journalEntryId: null,
        }).save({ session });

        const journal = await new this.journalModel({
          debitAccountId: sys._id,
          creditAccountId: walletAcc._id,
          assetSymbol: dto.assetSymbol,
          assetType: 'CURRENCY',
          assetId,
          amount: dto.amount,
          transactionIds: [
            (userTx._id as Types.ObjectId).toHexString(),
            (sysTx._id as Types.ObjectId).toHexString(),
          ],
          idempotencyKey: dto.idempotencyKey,
        }).save({ session });

        // Update transactions with journal entry ID
        await this.transactionModel.updateMany(
          { _id: { $in: [userTx._id, sysTx._id] } },
          { journalEntryId: journal._id },
          { session },
        );

        result = { balance: walletBal, journal };
      });
    } finally {
      await session.endSession();
      await this.lockService.release(firstKey, token1);
      await this.lockService.release(secondKey, token2);
    }
    if (!result) {
      throw new ConflictException(this.i18n.t('common.errors.deposit_failed'));
    }
    return result;
  }

  async getTransactionHistory(
    accountId: string,
    userId: string,
    assetSymbol?: string,
    limit = 50,
    offset = 0,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const account = await this.accountModel.findOne({
      _id: accountId,
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    });
    if (!account) {
      throw new NotFoundException(
        this.i18n.t('common.errors.wallet_not_found'),
      );
    }

    const filter: Record<string, unknown> = {
      accountId: new Types.ObjectId(accountId),
    };
    if (assetSymbol) {
      filter.assetSymbol = assetSymbol;
    }

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    return { transactions, total };
  }

  async getAllTransactionsReport(
    userId: string,
    assetSymbol?: string,
    startDate?: Date,
    endDate?: Date,
    limit = 100,
    offset = 0,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    // Get all user accounts
    const accounts = await this.accountModel.find({
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    });

    if (accounts.length === 0) {
      return { transactions: [], total: 0 };
    }

    const accountIds = accounts.map((acc) => acc._id);
    const filter: Record<string, unknown> = {
      accountId: { $in: accountIds },
    };

    if (assetSymbol) {
      filter.assetSymbol = assetSymbol;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        (filter.createdAt as Record<string, unknown>).$gte = startDate;
      }
      if (endDate) {
        (filter.createdAt as Record<string, unknown>).$lte = endDate;
      }
    }

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    return { transactions, total };
  }
}
