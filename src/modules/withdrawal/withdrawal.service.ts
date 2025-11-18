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
  BankWithdrawal,
  BankWithdrawalDocument,
  BankWithdrawalStatus,
} from './schemas/bank-withdrawal.schema';
import {
  WalletWithdrawalOrder,
  WalletWithdrawalOrderDocument,
  WithdrawalMethod,
} from './schemas/wallet-withdrawal-order.schema';
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
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import {
  ApproveWithdrawalDto,
  RejectWithdrawalDto,
  CompleteWithdrawalDto,
  CancelWithdrawalDto,
} from './dto/process-withdrawal.dto';
import {
  QueryWithdrawalDto,
  AdminQueryWithdrawalDto,
} from './dto/query-withdrawal.dto';
import {
  CalculateWithdrawalFeesDto,
  WithdrawalFeesCalculationResponseDto,
} from './dto/calculate-withdrawal-fees.dto';
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
export class WithdrawalService {
  constructor(
    @InjectModel(BankWithdrawal.name)
    private bankWithdrawalModel: Model<BankWithdrawalDocument>,
    @InjectModel(WalletWithdrawalOrder.name)
    private walletWithdrawalOrderModel: Model<WalletWithdrawalOrderDocument>,
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

  async createWithdrawalRequest(
    dto: CreateWithdrawalRequestDto,
    userId: string,
  ): Promise<BankWithdrawal> {
    // Validate bank exists and is active
    const bank = await this.bankModel.findOne({
      _id: new Types.ObjectId(dto.bankId),
      isActive: true,
      withdrawAvailable: true,
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

    if (!currencyConfig.withdrawEnabled) {
      throw new BadRequestException(
        this.i18n.t('common.errors.withdrawal_not_enabled_for_currency'),
      );
    }

    // User's input amount is the total reserved amount they want to withdraw
    const reservedAmount = dto.amount;

    // Calculate fees and taxes from the reserved amount
    const taxAmount = this.calculateFees(
      reservedAmount,
      currencyConfig.withdrawTax,
    );
    const feeAmount = this.calculateFees(
      reservedAmount,
      currencyConfig.withdrawFee,
    );

    // Calculate the net amount user will actually receive
    const netAmount = reservedAmount - taxAmount - feeAmount;

    if (netAmount <= 0) {
      throw new BadRequestException(
        this.i18n.t('common.errors.withdrawal_amount_too_low_after_fees'),
      );
    }

    // Get user's main wallet
    const userWallet = await this.accountModel.findOne({
      userId: new Types.ObjectId(userId),
      type: AccountType.WALLET,
      subtype: 'MAIN',
      deletedAt: null,
    });

    if (!userWallet) {
      throw new NotFoundException(
        this.i18n.t('common.errors.wallet_not_found'),
      );
    }

    // Check if user has sufficient balance
    const userBalance = await this.balanceModel.findOne({
      accountId: userWallet._id,
      assetType: 'CURRENCY',
      assetId: new Types.ObjectId(dto.currencyId),
      assetSymbol: currency.symbol,
    });

    if (!userBalance || userBalance.available < reservedAmount) {
      throw new BadRequestException(
        this.i18n.t('common.errors.insufficient_balance'),
      );
    }

    // Get the balance record ID before reserving
    const balanceRecord = await this.balanceModel.findOne({
      accountId: userWallet._id,
      assetType: 'CURRENCY',
      assetId: new Types.ObjectId(dto.currencyId),
      assetSymbol: currency.symbol,
    });

    // Reserve the balance (decrease available, increase reserved)
    await this.reserveBalance(
      (userWallet._id as Types.ObjectId).toString(),
      dto.currencyId,
      currency.symbol,
      reservedAmount,
    );

    // Create withdrawal request
    const withdrawal = new this.bankWithdrawalModel({
      userId: new Types.ObjectId(userId),
      bankId: new Types.ObjectId(dto.bankId),
      currencyId: new Types.ObjectId(dto.currencyId),
      balanceId: balanceRecord?._id || null,
      amount: netAmount, // Net amount user will receive
      taxAmount,
      feeAmount,
      reservedAmount, // Total amount reserved from wallet
      status: BankWithdrawalStatus.PENDING,
    });

    const savedWithdrawal = await withdrawal.save();

    // Create WalletWithdrawalOrder
    const orderId = `BANK-WITHDRAWAL-${(savedWithdrawal._id as Types.ObjectId).toString()}-${Date.now()}`;
    await new this.walletWithdrawalOrderModel({
      orderId,
      withdrawalMethod: WithdrawalMethod.BANK_TRANSFER,
      bankWithdrawalId: savedWithdrawal._id,
      walletAccountId: userWallet._id,
      userId: new Types.ObjectId(userId),
      baseAmount: netAmount, // Net amount user receives
      feesAmount: feeAmount,
      taxAmount,
      assetSymbol: currency.symbol,
      processed: false,
      journalEntryIds: [],
    }).save();

    return savedWithdrawal;
  }

  private async reserveBalance(
    accountId: string,
    assetId: string,
    assetSymbol: string,
    amount: number,
  ): Promise<void> {
    const lockKey = `wallet:${accountId}:${assetSymbol}`;
    const ttlMs = 10000;
    const token = await this.lockService.acquire(lockKey, ttlMs);

    if (!token) {
      throw new ConflictException(
        this.i18n.t('common.errors.unable_to_lock_balance'),
      );
    }

    try {
      const balance = await this.balanceModel.findOne({
        accountId: new Types.ObjectId(accountId),
        assetType: 'CURRENCY',
        assetId: new Types.ObjectId(assetId),
        assetSymbol,
      });

      if (!balance || balance.available < amount) {
        throw new BadRequestException(
          this.i18n.t('common.errors.insufficient_balance'),
        );
      }

      await this.balanceModel.updateOne(
        {
          accountId: new Types.ObjectId(accountId),
          assetType: 'CURRENCY',
          assetId: new Types.ObjectId(assetId),
          assetSymbol,
        },
        {
          $inc: {
            available: -amount,
            reserved: amount,
          },
        },
      );
    } finally {
      await this.lockService.release(lockKey, token);
    }
  }

  private async unreserveBalance(
    accountId: string,
    assetId: string,
    assetSymbol: string,
    amount: number,
  ): Promise<void> {
    const lockKey = `wallet:${accountId}:${assetSymbol}`;
    const ttlMs = 10000;
    const token = await this.lockService.acquire(lockKey, ttlMs);

    if (!token) {
      throw new ConflictException(
        this.i18n.t('common.errors.unable_to_lock_balance'),
      );
    }

    try {
      await this.balanceModel.updateOne(
        {
          accountId: new Types.ObjectId(accountId),
          assetType: 'CURRENCY',
          assetId: new Types.ObjectId(assetId),
          assetSymbol,
        },
        {
          $inc: {
            available: amount,
            reserved: -amount,
          },
        },
      );
    } finally {
      await this.lockService.release(lockKey, token);
    }
  }

  async approveWithdrawal(
    withdrawalId: string,
    dto: ApproveWithdrawalDto,
    adminId: string,
  ): Promise<BankWithdrawal> {
    const withdrawal = await this.bankWithdrawalModel.findOne({
      _id: new Types.ObjectId(withdrawalId),
    });

    if (!withdrawal) {
      throw new NotFoundException(
        this.i18n.t('common.errors.withdrawal_not_found'),
      );
    }

    if (withdrawal.status !== BankWithdrawalStatus.PENDING) {
      throw new BadRequestException(
        this.i18n.t('common.errors.withdrawal_already_processed'),
      );
    }

    withdrawal.status = BankWithdrawalStatus.PROCESSING;
    withdrawal.processedBy = adminId;
    withdrawal.processedAt = new Date();
    if (dto.adminNotes) {
      withdrawal.adminNotes = dto.adminNotes;
    }

    return await withdrawal.save();
  }

  async rejectWithdrawal(
    withdrawalId: string,
    dto: RejectWithdrawalDto,
    adminId: string,
  ): Promise<BankWithdrawal> {
    const withdrawal = await this.bankWithdrawalModel.findOne({
      _id: new Types.ObjectId(withdrawalId),
    });

    if (!withdrawal) {
      throw new NotFoundException(
        this.i18n.t('common.errors.withdrawal_not_found'),
      );
    }

    if (withdrawal.status !== BankWithdrawalStatus.PENDING) {
      throw new BadRequestException(
        this.i18n.t('common.errors.withdrawal_already_processed'),
      );
    }

    // Get withdrawal order to get wallet info
    const order = await this.walletWithdrawalOrderModel.findOne({
      bankWithdrawalId: withdrawal._id,
    });

    if (!order) {
      throw new NotFoundException(
        this.i18n.t('common.errors.withdrawal_order_not_found'),
      );
    }

    // Unreserve the balance
    await this.unreserveBalance(
      order.walletAccountId.toString(),
      withdrawal.currencyId.toString(),
      order.assetSymbol,
      withdrawal.reservedAmount,
    );

    withdrawal.status = BankWithdrawalStatus.REJECTED;
    withdrawal.rejectionReason = dto.rejectionReason;
    withdrawal.processedBy = adminId;
    withdrawal.processedAt = new Date();
    if (dto.adminNotes) {
      withdrawal.adminNotes = dto.adminNotes;
    }

    return await withdrawal.save();
  }

  async completeWithdrawal(
    withdrawalId: string,
    dto: CompleteWithdrawalDto,
    adminId: string,
  ): Promise<BankWithdrawal> {
    const withdrawal = await this.bankWithdrawalModel.findOne({
      _id: new Types.ObjectId(withdrawalId),
    });

    if (!withdrawal) {
      throw new NotFoundException(
        this.i18n.t('common.errors.withdrawal_not_found'),
      );
    }

    if (
      withdrawal.status !== BankWithdrawalStatus.PROCESSING &&
      withdrawal.status !== BankWithdrawalStatus.APPROVED
    ) {
      throw new BadRequestException(
        this.i18n.t('common.errors.withdrawal_not_in_processing_state'),
      );
    }

    // Process the actual wallet debit and credit platform accounts
    await this.debitWallet(withdrawal);

    withdrawal.status = BankWithdrawalStatus.COMPLETED;
    withdrawal.transactionReference = dto.transactionReference;
    if (dto.transferReceiptUrl) {
      withdrawal.transferReceiptUrl = dto.transferReceiptUrl;
    }
    if (dto.adminNotes) {
      withdrawal.adminNotes = dto.adminNotes;
    }
    withdrawal.completedBy = adminId;
    withdrawal.completedAt = new Date();
    withdrawal.walletDebited = true;

    return await withdrawal.save();
  }

  async cancelWithdrawal(
    withdrawalId: string,
    dto: CancelWithdrawalDto,
    adminId: string,
  ): Promise<BankWithdrawal> {
    const withdrawal = await this.bankWithdrawalModel.findOne({
      _id: new Types.ObjectId(withdrawalId),
    });

    if (!withdrawal) {
      throw new NotFoundException(
        this.i18n.t('common.errors.withdrawal_not_found'),
      );
    }

    if (
      withdrawal.status !== BankWithdrawalStatus.PROCESSING &&
      withdrawal.status !== BankWithdrawalStatus.APPROVED
    ) {
      throw new BadRequestException(
        this.i18n.t('common.errors.cannot_cancel_withdrawal_in_this_state'),
      );
    }

    // Get withdrawal order to get wallet info
    const order = await this.walletWithdrawalOrderModel.findOne({
      bankWithdrawalId: withdrawal._id,
    });

    if (!order) {
      throw new NotFoundException(
        this.i18n.t('common.errors.withdrawal_order_not_found'),
      );
    }

    // Unreserve the balance
    await this.unreserveBalance(
      order.walletAccountId.toString(),
      withdrawal.currencyId.toString(),
      order.assetSymbol,
      withdrawal.reservedAmount,
    );

    withdrawal.status = BankWithdrawalStatus.CANCELLED;
    withdrawal.cancellationReason = dto.cancellationReason;
    if (dto.adminNotes) {
      withdrawal.adminNotes = dto.adminNotes;
    }
    withdrawal.completedBy = adminId;
    withdrawal.completedAt = new Date();

    return await withdrawal.save();
  }

  private async debitWallet(withdrawal: BankWithdrawalDocument): Promise<void> {
    const userId = withdrawal.userId.toString();
    const currencySymbol = await this.getCurrencySymbol(
      withdrawal.currencyId.toString(),
    );

    // Check idempotency
    const idempotencyKey = `bank-withdrawal-${(withdrawal._id as Types.ObjectId).toString()}`;
    const existingJournal = await this.journalModel.findOne({
      idempotencyKey,
    });
    if (existingJournal) {
      throw new ConflictException(
        this.i18n.t('common.errors.withdrawal_already_debited'),
      );
    }

    // Get user's main wallet
    const userWallet = await this.accountModel.findOne({
      userId: new Types.ObjectId(userId),
      type: AccountType.WALLET,
      subtype: 'MAIN',
      deletedAt: null,
    });

    if (!userWallet) {
      throw new NotFoundException(
        this.i18n.t('common.errors.wallet_not_found'),
      );
    }

    // Get system accounts for fees and tax
    const systemFees = await this.ensureSystemTreasury('FEES');
    const systemTax = await this.ensureSystemTreasury('TAX');

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
          for (const { key: k, token: t } of tokens) {
            await this.lockService.release(k, t);
          }
          throw new ConflictException(
            this.i18n.t('common.errors.withdrawal_processing_failed'),
          );
        }
        tokens.push({ key, token });
      }

      const session = await this.mongo.startSession();
      try {
        await session.withTransaction(async () => {
          if (!Array.isArray(withdrawal.journalEntryIds)) {
            withdrawal.journalEntryIds = [];
          }

          // 1. Debit user wallet - decrease reserved balance
          const userBalBefore = await this.balanceModel.findOne(
            {
              accountId: userWallet._id,
              assetType: 'CURRENCY',
              assetId: withdrawal.currencyId,
              assetSymbol: currencySymbol,
            },
            null,
            { session },
          );

          if (
            !userBalBefore ||
            userBalBefore.reserved < withdrawal.reservedAmount
          ) {
            throw new BadRequestException(
              this.i18n.t('common.errors.insufficient_reserved_balance'),
            );
          }

          const balanceBefore = userBalBefore.available;

          const userBal = await this.balanceModel.findOneAndUpdate(
            {
              accountId: userWallet._id,
              assetType: 'CURRENCY',
              assetId: withdrawal.currencyId,
              assetSymbol: currencySymbol,
            },
            { $inc: { reserved: -withdrawal.reservedAmount } },
            { new: true, session },
          );

          if (!userBal) {
            throw new BadRequestException(
              this.i18n.t('common.errors.withdrawal_processing_failed'),
            );
          }

          const userTx = await new this.transactionModel({
            accountId: userWallet._id,
            assetType: 'CURRENCY',
            assetId: withdrawal.currencyId,
            balanceId: userBal._id,
            assetSymbol: currencySymbol,
            type: TransactionType.WITHDRAWAL,
            amount: withdrawal.reservedAmount, // Full reserved amount (not just net amount)
            balanceBefore,
            balanceAfter: userBal.available,
            title: {
              en: 'Bank withdrawal',
              ar: 'سحب بنكي',
            },
            journalEntryId: null,
          }).save({ session });

          const journal1 = await new this.journalModel({
            debitAccountId: userWallet._id,
            assetSymbol: currencySymbol,
            assetType: 'CURRENCY',
            assetId: withdrawal.currencyId,
            amount: withdrawal.reservedAmount, // Full reserved amount
            transactionIds: [(userTx._id as Types.ObjectId).toHexString()],
            idempotencyKey,
          }).save({ session });

          await this.transactionModel.updateOne(
            { _id: userTx._id },
            { journalEntryId: journal1._id },
            { session },
          );

          withdrawal.journalEntryIds.push(journal1._id as Types.ObjectId);

          // 2. Credit platform fees account if feeAmount > 0
          if (withdrawal.feeAmount > 0) {
            const feesBalBefore = await this.balanceModel.findOne(
              {
                accountId: systemFees._id,
                assetType: 'CURRENCY',
                assetId: withdrawal.currencyId,
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
                assetId: withdrawal.currencyId,
                assetSymbol: currencySymbol,
              },
              { $inc: { available: withdrawal.feeAmount } },
              { new: true, upsert: true, session },
            );

            const feesTx = await new this.transactionModel({
              accountId: systemFees._id,
              assetType: 'CURRENCY',
              assetId: withdrawal.currencyId,
              balanceId: feesBal._id,
              assetSymbol: currencySymbol,
              type: TransactionType.DEPOSIT,
              amount: withdrawal.feeAmount,
              balanceBefore: feesBefore,
              balanceAfter: feesBal.available,
              title: {
                en: 'Platform fees from bank withdrawal',
                ar: 'عمولة المنصة من السحب البنكي',
              },
              journalEntryId: null,
            }).save({ session });

            const journal2 = await new this.journalModel({
              creditAccountId: systemFees._id,
              assetSymbol: currencySymbol,
              assetType: 'CURRENCY',
              assetId: withdrawal.currencyId,
              amount: withdrawal.feeAmount,
              transactionIds: [(feesTx._id as Types.ObjectId).toHexString()],
              idempotencyKey: `${idempotencyKey}-fees`,
            }).save({ session });

            await this.transactionModel.updateOne(
              { _id: feesTx._id },
              { journalEntryId: journal2._id },
              { session },
            );

            withdrawal.journalEntryIds.push(journal2._id as Types.ObjectId);
          }

          // 3. Credit tax account if taxAmount > 0
          if (withdrawal.taxAmount > 0) {
            const taxBalBefore = await this.balanceModel.findOne(
              {
                accountId: systemTax._id,
                assetType: 'CURRENCY',
                assetId: withdrawal.currencyId,
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
                assetId: withdrawal.currencyId,
                assetSymbol: currencySymbol,
              },
              { $inc: { available: withdrawal.taxAmount } },
              { new: true, upsert: true, session },
            );

            const taxTx = await new this.transactionModel({
              accountId: systemTax._id,
              assetType: 'CURRENCY',
              assetId: withdrawal.currencyId,
              balanceId: taxBal._id,
              assetSymbol: currencySymbol,
              type: TransactionType.DEPOSIT,
              amount: withdrawal.taxAmount,
              balanceBefore: taxBefore,
              balanceAfter: taxBal.available,
              title: {
                en: 'Tax from bank withdrawal',
                ar: 'ضريبة من السحب البنكي',
              },
              journalEntryId: null,
            }).save({ session });

            const journal3 = await new this.journalModel({
              creditAccountId: systemTax._id,
              assetSymbol: currencySymbol,
              assetType: 'CURRENCY',
              assetId: withdrawal.currencyId,
              amount: withdrawal.taxAmount,
              transactionIds: [(taxTx._id as Types.ObjectId).toHexString()],
              idempotencyKey: `${idempotencyKey}-tax`,
            }).save({ session });

            await this.transactionModel.updateOne(
              { _id: taxTx._id },
              { journalEntryId: journal3._id },
              { session },
            );

            withdrawal.journalEntryIds.push(journal3._id as Types.ObjectId);
          }

          // Persist journalEntryIds on the BankWithdrawal document
          await this.bankWithdrawalModel.updateOne(
            { _id: withdrawal._id },
            { journalEntryIds: withdrawal.journalEntryIds },
            { session },
          );

          // Mark withdrawal order as processed and attach journal entries
          await this.walletWithdrawalOrderModel.updateOne(
            { bankWithdrawalId: withdrawal._id },
            { processed: true, journalEntryIds: withdrawal.journalEntryIds },
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

  async getUserWithdrawals(
    userId: string,
    query: QueryWithdrawalDto,
  ): Promise<PaginatedResponseDto<BankWithdrawal>> {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;

    const filter: FilterQuery<BankWithdrawalDocument> = {
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

    const [withdrawals, total] = await Promise.all([
      this.bankWithdrawalModel
        .find(filter)
        .populate('bank')
        .populate('currency')
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .exec(),
      this.bankWithdrawalModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(withdrawals, page, limit, total);
  }

  async getUserWithdrawal(
    userId: string,
    withdrawalId: string,
  ): Promise<BankWithdrawal> {
    const withdrawal = await this.bankWithdrawalModel
      .findOne({
        _id: new Types.ObjectId(withdrawalId),
        userId: new Types.ObjectId(userId),
      })
      .populate('bank')
      .populate('currency');

    if (!withdrawal) {
      throw new NotFoundException(
        this.i18n.t('common.errors.withdrawal_not_found'),
      );
    }

    return withdrawal;
  }

  async getAllWithdrawals(
    query: AdminQueryWithdrawalDto,
  ): Promise<PaginatedResponseDto<BankWithdrawal>> {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;

    const filter: FilterQuery<BankWithdrawalDocument> = {};

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

    if (query.completedBy) {
      filter.completedBy = new Types.ObjectId(query.completedBy);
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

    const [withdrawals, total] = await Promise.all([
      this.bankWithdrawalModel
        .find(filter)
        .populate('userId')
        .populate('bank')
        .populate('currency')
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit)
        .exec(),
      this.bankWithdrawalModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(withdrawals, page, limit, total);
  }

  async getWithdrawalById(withdrawalId: string): Promise<BankWithdrawal> {
    const withdrawal = await this.bankWithdrawalModel
      .findOne({
        _id: new Types.ObjectId(withdrawalId),
      })
      .populate('userId')
      .populate('bank')
      .populate('currency');

    if (!withdrawal) {
      throw new NotFoundException(
        this.i18n.t('common.errors.withdrawal_not_found'),
      );
    }

    return withdrawal;
  }

  async calculateWithdrawalFees(
    dto: CalculateWithdrawalFeesDto,
  ): Promise<WithdrawalFeesCalculationResponseDto> {
    const bank = await this.bankModel.findOne({
      _id: new Types.ObjectId(dto.bankId),
      isActive: true,
      withdrawAvailable: true,
      deletedAt: null,
    });

    if (!bank) {
      throw new NotFoundException(
        this.i18n.t('common.errors.bank_not_found_or_inactive'),
      );
    }

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

    const currencyConfig = bank.currencies.find(
      (c) => c.currencyId.toString() === dto.currencyId,
    );

    if (!currencyConfig) {
      throw new BadRequestException(
        this.i18n.t('common.errors.currency_not_supported_by_bank'),
      );
    }

    if (!currencyConfig.withdrawEnabled) {
      throw new BadRequestException(
        this.i18n.t('common.errors.withdrawal_not_enabled_for_currency'),
      );
    }

    const taxAmount = this.calculateFees(
      dto.amount,
      currencyConfig.withdrawTax,
    );
    const feeAmount = this.calculateFees(
      dto.amount,
      currencyConfig.withdrawFee,
    );
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
