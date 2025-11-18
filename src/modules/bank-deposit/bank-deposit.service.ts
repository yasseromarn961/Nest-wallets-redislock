import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { I18nService } from 'nestjs-i18n';
import {
  BankDeposit,
  BankDepositDocument,
  BankDepositStatus,
} from './schemas/bank-deposit.schema';
import { Bank, BankDocument } from '../bank/schemas/bank.schema';
import {
  Currency,
  CurrencyDocument,
} from '../currency/schemas/currency.schema';
import {
  Account,
  AccountDocument,
  AccountType,
  AccountStatus,
} from '../wallet/schemas/account.schema';
import { Balance, BalanceDocument } from '../wallet/schemas/balance.schema';
import {
  JournalEntry,
  JournalEntryDocument,
} from '../wallet/schemas/journal-entry.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
} from '../wallet/schemas/transaction.schema';
import {
  WalletDepositOrder,
  WalletDepositOrderDocument,
  DepositType,
} from '../wallet/schemas/wallet-deposit-order.schema';
import { CreateBankDepositDto } from './dto/create-bank-deposit.dto';
import { ProcessBankDepositDto } from './dto/process-bank-deposit.dto';
import {
  QueryBankDepositDto,
  AdminQueryBankDepositDto,
} from './dto/query-bank-deposit.dto';
import {
  CalculateDepositFeesDto,
  DepositFeesCalculationResponseDto,
} from './dto/calculate-deposit-fees.dto';
import { MongoService } from '../../common/services/internal/mongo.service';
import { RedisLockService } from '../../common/services/internal/redis-lock.service';
import { FeeType } from '../../common/enums/index';
import {
  createPaginatedResponse,
  PaginatedResponseDto,
} from '../../common/dto/pagination.dto';

interface FeeStructure {
  enabled?: boolean;
  type?: FeeType;
  percentage?: number;
  fixedAmount?: number;
}

@Injectable()
export class BankDepositService {
  constructor(
    @InjectModel(BankDeposit.name)
    private bankDepositModel: Model<BankDepositDocument>,
    @InjectModel(Bank.name)
    private bankModel: Model<BankDocument>,
    @InjectModel(Currency.name)
    private currencyModel: Model<CurrencyDocument>,
    @InjectModel(Account.name)
    private accountModel: Model<AccountDocument>,
    @InjectModel(Balance.name)
    private balanceModel: Model<BalanceDocument>,
    @InjectModel(JournalEntry.name)
    private journalModel: Model<JournalEntryDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(WalletDepositOrder.name)
    private walletDepositOrderModel: Model<WalletDepositOrderDocument>,
    private readonly mongo: MongoService,
    private readonly lockService: RedisLockService,
    private readonly i18n: I18nService,
  ) {}

  private calculateFees(amount: number, fees: FeeStructure): number {
    let totalFees = 0;
    if (!fees?.enabled) {
      return totalFees;
    }
    if (fees.type === FeeType.PERCENTAGE || fees.type === FeeType.HYBRID) {
      totalFees += (amount * (fees.percentage || 0)) / 100;
    }
    if (fees.type === FeeType.FIXED || fees.type === FeeType.HYBRID) {
      totalFees += fees.fixedAmount || 0;
    }
    return totalFees;
  }

  async createDeposit(
    dto: CreateBankDepositDto,
    userId: string,
  ): Promise<BankDeposit> {
    // Validate bank exists and is active
    const bank = await this.bankModel.findOne({
      _id: new Types.ObjectId(dto.bankId),
      isActive: true,
      depositAvailable: true,
      deletedAt: null,
    });

    if (!bank) {
      throw new NotFoundException(
        this.i18n.t('common.errors.bank_not_found_or_inactive'),
      );
    }

    // Validate currency exists and is active
    const currency = await this.currencyModel.findOne({
      _id: new Types.ObjectId(dto.currencyId),
      isActive: true,
      deletedAt: null,
    });

    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found_or_inactive'),
      );
    }

    // Find currency configuration in bank
    const currencyConfig = bank.currencies.find(
      (c) => c.currencyId.toString() === dto.currencyId,
    );

    if (!currencyConfig) {
      throw new BadRequestException(
        this.i18n.t('common.errors.currency_not_supported_by_bank'),
      );
    }

    if (!currencyConfig.depositEnabled) {
      throw new BadRequestException(
        this.i18n.t('common.errors.deposit_not_enabled_for_currency'),
      );
    }

    // Calculate fees and taxes based on bank configuration
    const taxAmount = this.calculateFees(dto.amount, currencyConfig.depositTax);
    const feeAmount = this.calculateFees(dto.amount, currencyConfig.depositFee);

    // Create deposit request
    const deposit = new this.bankDepositModel({
      userId: new Types.ObjectId(userId),
      bankId: new Types.ObjectId(dto.bankId),
      currencyId: new Types.ObjectId(dto.currencyId),
      amount: dto.amount,
      taxAmount,
      feeAmount,
      transferImageUrl: dto.transferImageUrl || null,
      transactionReference: dto.transactionReference || null,
      status: BankDepositStatus.PENDING,
    });

    const savedDeposit = await deposit.save();

    // Get user's main wallet
    let userWallet = await this.accountModel.findOne({
      userId: new Types.ObjectId(userId),
      type: AccountType.WALLET,
      subtype: 'MAIN',
      deletedAt: null,
    });

    if (!userWallet) {
      userWallet = new this.accountModel({
        type: AccountType.WALLET,
        userId: new Types.ObjectId(userId),
        subtype: 'MAIN',
        name: 'Main Wallet',
        status: AccountStatus.ACTIVE,
      });
      await userWallet.save();
    }

    // Create WalletDepositOrder
    const orderId = `BANK-DEPOSIT-${(savedDeposit._id as Types.ObjectId).toString()}-${Date.now()}`;
    await new this.walletDepositOrderModel({
      orderId,
      depositType: DepositType.BANK,
      paymentId: null,
      bankDepositId: savedDeposit._id,
      walletAccountId: userWallet._id,
      userId: new Types.ObjectId(userId),
      baseAmount: dto.amount,
      feesAmount: feeAmount,
      taxAmount,
      assetSymbol: currency.symbol,
      assetId: currency._id,
      processed: false,
      journalEntryIds: [],
    }).save();

    return savedDeposit;
  }

  async processDeposit(
    depositId: string,
    dto: ProcessBankDepositDto,
    adminId: string,
  ): Promise<BankDeposit> {
    const deposit = await this.bankDepositModel.findOne({
      _id: new Types.ObjectId(depositId),
    });

    if (!deposit) {
      throw new NotFoundException(
        this.i18n.t('common.errors.deposit_not_found'),
      );
    }

    if (deposit.status !== BankDepositStatus.PENDING) {
      throw new BadRequestException(
        this.i18n.t('common.errors.deposit_already_processed'),
      );
    }

    // Update deposit status
    deposit.status = dto.status;
    deposit.processedBy = adminId;
    deposit.processedAt = new Date();

    if (dto.status === BankDepositStatus.REJECTED) {
      if (!dto.rejectionReason) {
        throw new BadRequestException(
          this.i18n.t('common.errors.rejection_reason_required'),
        );
      }
      deposit.rejectionReason = dto.rejectionReason;
      await deposit.save();
      return deposit;
    }

    // If approved, process the wallet credit
    await this.creditWallet(deposit);

    deposit.walletCredited = true;
    await deposit.save();

    return deposit;
  }

  private async creditWallet(deposit: BankDepositDocument): Promise<void> {
    const userId = deposit.userId.toString();
    const currencySymbol = await this.getCurrencySymbol(
      deposit.currencyId.toString(),
    );

    // Check idempotency first (before acquiring locks)
    const idempotencyKey = `bank-deposit-${(deposit._id as Types.ObjectId).toString()}`;
    const existingJournal = await this.journalModel.findOne({
      idempotencyKey,
    });
    if (existingJournal) {
      throw new ConflictException(
        this.i18n.t('common.errors.deposit_already_credited'),
      );
    }

    // Ensure user has a main wallet account
    let userWallet = await this.accountModel.findOne({
      userId: new Types.ObjectId(userId),
      type: AccountType.WALLET,
      subtype: 'MAIN',
      deletedAt: null,
    });

    if (!userWallet) {
      // Create main wallet for user
      userWallet = new this.accountModel({
        type: AccountType.WALLET,
        userId: new Types.ObjectId(userId),
        subtype: 'MAIN',
        name: 'Main Wallet',
        status: AccountStatus.ACTIVE,
      });
      await userWallet.save();
    }

    // Get system accounts for fees and tax
    const systemFees = await this.ensureSystemTreasury('FEES');
    const systemTax = await this.ensureSystemTreasury('TAX');

    // Calculate net amount to credit to user (amount - tax - fee)
    const netAmount = deposit.amount - deposit.taxAmount - deposit.feeAmount;

    if (netAmount <= 0) {
      throw new BadRequestException(
        this.i18n.t('common.errors.invalid_net_amount'),
      );
    }

    // Prepare lock keys
    const walletIdStr = (userWallet._id as Types.ObjectId).toHexString();
    const feesIdStr = (systemFees._id as Types.ObjectId).toHexString();
    const taxIdStr = (systemTax._id as Types.ObjectId).toHexString();

    const lockKeys = [
      `wallet:${walletIdStr}:${currencySymbol}`,
      `wallet:${feesIdStr}:${currencySymbol}`,
      `wallet:${taxIdStr}:${currencySymbol}`,
    ].sort();

    const ttlMs = 10000;
    const tokens: Array<{ key: string; token: string }> = [];

    try {
      // Acquire all locks sequentially
      for (const key of lockKeys) {
        const token = await this.lockService.acquire(key, ttlMs);
        if (!token) {
          // Release already acquired locks before throwing
          for (const { key: k, token: t } of tokens) {
            await this.lockService.release(k, t);
          }
          throw new ConflictException(
            this.i18n.t('common.errors.deposit_processing_failed'),
          );
        }
        tokens.push({ key, token });
      }

      const session = await this.mongo.startSession();
      try {
        await session.withTransaction(async () => {
          if (!Array.isArray(deposit.journalEntryIds)) {
            deposit.journalEntryIds = [];
          }
          // 1. Credit user wallet with net amount
          if (netAmount > 0) {
            const userBalBefore = await this.balanceModel.findOne(
              {
                accountId: userWallet._id,
                assetType: 'CURRENCY',
                assetId: deposit.currencyId,
                assetSymbol: currencySymbol,
              },
              null,
              { session },
            );
            const balanceBefore = userBalBefore?.available || 0;

            const userBal = await this.balanceModel.findOneAndUpdate(
              {
                accountId: userWallet._id,
                assetType: 'CURRENCY',
                assetId: deposit.currencyId,
                assetSymbol: currencySymbol,
              },
              { $inc: { available: netAmount } },
              { new: true, upsert: true, session },
            );

            const userTx = await new this.transactionModel({
              accountId: userWallet._id,
              assetType: 'CURRENCY',
              assetId: deposit.currencyId,
              balanceId: userBal._id,
              assetSymbol: currencySymbol,
              type: TransactionType.DEPOSIT,
              amount: netAmount,
              balanceBefore,
              balanceAfter: userBal.available,
              title: {
                en: 'Bank deposit',
                ar: 'إيداع بنكي',
              },
              journalEntryId: null,
            }).save({ session });

            const journal1 = await new this.journalModel({
              creditAccountId: userWallet._id,
              assetSymbol: currencySymbol,
              assetType: 'CURRENCY',
              assetId: deposit.currencyId,
              amount: netAmount,
              transactionIds: [(userTx._id as Types.ObjectId).toHexString()],
              idempotencyKey,
            }).save({ session });

            await this.transactionModel.updateOne(
              { _id: userTx._id },
              { journalEntryId: journal1._id },
              { session },
            );

            deposit.journalEntryIds.push(journal1._id as Types.ObjectId);
          }

          // 2. Credit platform fees account
          if (deposit.feeAmount > 0) {
            const feesBalBefore = await this.balanceModel.findOne(
              {
                accountId: systemFees._id,
                assetType: 'CURRENCY',
                assetId: deposit.currencyId,
                assetSymbol: currencySymbol,
              },
              null,
              { session },
            );
            const feesBefore = feesBalBefore?.available || 0;

            const feesBal = await this.balanceModel.findOneAndUpdate(
              {
                accountId: systemFees._id,
                assetType: 'CURRENCY',
                assetId: deposit.currencyId,
                assetSymbol: currencySymbol,
              },
              { $inc: { available: deposit.feeAmount } },
              { new: true, upsert: true, session },
            );

            const feesTx = await new this.transactionModel({
              accountId: systemFees._id,
              assetType: 'CURRENCY',
              assetId: deposit.currencyId,
              balanceId: feesBal._id,
              assetSymbol: currencySymbol,
              type: TransactionType.DEPOSIT,
              amount: deposit.feeAmount,
              balanceBefore: feesBefore,
              balanceAfter: feesBal.available,
              title: {
                en: 'Platform fees from bank deposit',
                ar: 'عمولة المنصة من الإيداع البنكي',
              },
              journalEntryId: null,
            }).save({ session });

            const journal2 = await new this.journalModel({
              creditAccountId: systemFees._id,
              assetSymbol: currencySymbol,
              assetType: 'CURRENCY',
              assetId: deposit.currencyId,
              amount: deposit.feeAmount,
              transactionIds: [(feesTx._id as Types.ObjectId).toHexString()],
              idempotencyKey: `${idempotencyKey}-fees`,
            }).save({ session });

            await this.transactionModel.updateOne(
              { _id: feesTx._id },
              { journalEntryId: journal2._id },
              { session },
            );
            deposit.journalEntryIds.push(journal2._id as Types.ObjectId);
          }

          // 3. Credit tax account
          if (deposit.taxAmount > 0) {
            const taxBalBefore = await this.balanceModel.findOne(
              {
                accountId: systemTax._id,
                assetType: 'CURRENCY',
                assetId: deposit.currencyId,
                assetSymbol: currencySymbol,
              },
              null,
              { session },
            );
            const taxBefore = taxBalBefore?.available || 0;

            const taxBal = await this.balanceModel.findOneAndUpdate(
              {
                accountId: systemTax._id,
                assetType: 'CURRENCY',
                assetId: deposit.currencyId,
                assetSymbol: currencySymbol,
              },
              { $inc: { available: deposit.taxAmount } },
              { new: true, upsert: true, session },
            );

            const taxTx = await new this.transactionModel({
              accountId: systemTax._id,
              assetType: 'CURRENCY',
              assetId: deposit.currencyId,
              balanceId: taxBal._id,
              assetSymbol: currencySymbol,
              type: TransactionType.DEPOSIT,
              amount: deposit.taxAmount,
              balanceBefore: taxBefore,
              balanceAfter: taxBal.available,
              title: {
                en: 'Tax from bank deposit',
                ar: 'ضريبة من الإيداع البنكي',
              },
              journalEntryId: null,
            }).save({ session });

            const journal3 = await new this.journalModel({
              creditAccountId: systemTax._id,
              assetSymbol: currencySymbol,
              assetType: 'CURRENCY',
              assetId: deposit.currencyId,
              amount: deposit.taxAmount,
              transactionIds: [(taxTx._id as Types.ObjectId).toHexString()],
              idempotencyKey: `${idempotencyKey}-tax`,
            }).save({ session });

            await this.transactionModel.updateOne(
              { _id: taxTx._id },
              { journalEntryId: journal3._id },
              { session },
            );
            deposit.journalEntryIds.push(journal3._id as Types.ObjectId);
          }

          // Persist journalEntryIds on the BankDeposit document
          await this.bankDepositModel.updateOne(
            { _id: deposit._id },
            { journalEntryIds: deposit.journalEntryIds },
            { session },
          );

          // Mark deposit order as processed and attach journal entries
          await this.walletDepositOrderModel.updateOne(
            { bankDepositId: deposit._id },
            { processed: true, journalEntryIds: deposit.journalEntryIds },
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

  private async ensureSystemTreasury(
    subtype: string,
  ): Promise<AccountDocument> {
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
      name: `System ${subtype}`,
      status: AccountStatus.ACTIVE,
    });
    return created.save();
  }

  private async getCurrencySymbol(currencyId: string): Promise<string> {
    const currency = await this.currencyModel.findById(currencyId);
    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }
    return currency.symbol;
  }

  async getUserDeposits(
    userId: string,
    query: QueryBankDepositDto,
  ): Promise<PaginatedResponseDto<BankDeposit>> {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;

    const filter: FilterQuery<BankDepositDocument> = {
      userId: new Types.ObjectId(userId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.bankId) {
      filter.bankId = new Types.ObjectId(query.bankId);
    }

    if (query.currencyId) {
      filter.currencyId = new Types.ObjectId(query.currencyId);
    }

    if (query.fromDate || query.toDate) {
      filter.createdAt = {};
      if (query.fromDate) {
        (filter.createdAt as Record<string, unknown>).$gte = new Date(
          query.fromDate,
        );
      }
      if (query.toDate) {
        (filter.createdAt as Record<string, unknown>).$lte = new Date(
          query.toDate,
        );
      }
    }

    const [deposits, total] = await Promise.all([
      this.bankDepositModel
        .find(filter)
        .populate('bank')
        .populate('currency')
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .exec(),
      this.bankDepositModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(deposits, page, limit, total);
  }

  async getUserDeposit(
    userId: string,
    depositId: string,
  ): Promise<BankDeposit> {
    const deposit = await this.bankDepositModel
      .findOne({
        _id: new Types.ObjectId(depositId),
        userId: new Types.ObjectId(userId),
      })
      .populate('bank')
      .populate('currency');

    if (!deposit) {
      throw new NotFoundException(
        this.i18n.t('common.errors.deposit_not_found'),
      );
    }

    return deposit;
  }

  async getAllDeposits(
    query: AdminQueryBankDepositDto,
  ): Promise<PaginatedResponseDto<BankDeposit>> {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;

    const filter: FilterQuery<BankDepositDocument> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    if (query.bankId) {
      filter.bankId = new Types.ObjectId(query.bankId);
    }

    if (query.currencyId) {
      filter.currencyId = new Types.ObjectId(query.currencyId);
    }

    if (query.processedBy) {
      filter.processedBy = new Types.ObjectId(query.processedBy);
    }

    if (query.fromDate || query.toDate) {
      filter.createdAt = {};
      if (query.fromDate) {
        (filter.createdAt as Record<string, unknown>).$gte = new Date(
          query.fromDate,
        );
      }
      if (query.toDate) {
        (filter.createdAt as Record<string, unknown>).$lte = new Date(
          query.toDate,
        );
      }
    }

    const [deposits, total] = await Promise.all([
      this.bankDepositModel
        .find(filter)
        .populate('userId')
        .populate('bank')
        .populate('currency')
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .exec(),
      this.bankDepositModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(deposits, page, limit, total);
  }

  async getDepositById(depositId: string): Promise<BankDeposit> {
    const deposit = await this.bankDepositModel
      .findOne({
        _id: new Types.ObjectId(depositId),
      })
      .populate('userId')
      .populate('bank')
      .populate('currency');

    if (!deposit) {
      throw new NotFoundException(
        this.i18n.t('common.errors.deposit_not_found'),
      );
    }

    return deposit;
  }

  async calculateDepositFees(
    dto: CalculateDepositFeesDto,
  ): Promise<DepositFeesCalculationResponseDto> {
    // Validate bank exists and is active
    const bank = await this.bankModel.findOne({
      _id: new Types.ObjectId(dto.bankId),
      isActive: true,
      depositAvailable: true,
      deletedAt: null,
    });

    if (!bank) {
      throw new NotFoundException(
        this.i18n.t('common.errors.bank_not_found_or_inactive'),
      );
    }

    // Validate currency exists and is active
    const currency = await this.currencyModel.findOne({
      _id: new Types.ObjectId(dto.currencyId),
      isActive: true,
      deletedAt: null,
    });

    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found_or_inactive'),
      );
    }

    // Find currency configuration in bank
    const currencyConfig = bank.currencies.find(
      (c) => c.currencyId.toString() === dto.currencyId,
    );

    if (!currencyConfig) {
      throw new BadRequestException(
        this.i18n.t('common.errors.currency_not_supported_by_bank'),
      );
    }

    if (!currencyConfig.depositEnabled) {
      throw new BadRequestException(
        this.i18n.t('common.errors.deposit_not_enabled_for_currency'),
      );
    }

    // Calculate fees and taxes based on bank configuration
    const taxAmount = this.calculateFees(dto.amount, currencyConfig.depositTax);
    const feeAmount = this.calculateFees(dto.amount, currencyConfig.depositFee);
    const totalDeductions = taxAmount + feeAmount;
    const netAmount = dto.amount - totalDeductions;

    return {
      amount: dto.amount,
      taxAmount,
      feeAmount,
      netAmount,
      totalDeductions,
      currencySymbol: currency.symbol,
      bankNameEn: bank.name.en,
      bankNameAr: bank.name.ar,
    };
  }
}
