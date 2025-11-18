import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalAdminController } from './withdrawal.admin.controller';
import {
  BankWithdrawal,
  BankWithdrawalSchema,
} from './schemas/bank-withdrawal.schema';
import {
  WalletWithdrawalOrder,
  WalletWithdrawalOrderSchema,
} from './schemas/wallet-withdrawal-order.schema';
import { Bank, BankSchema } from '../bank/schemas/bank.schema';
import { Currency, CurrencySchema } from '../currency/schemas/currency.schema';
import { Account, AccountSchema } from '../wallet/schemas/account.schema';
import { Balance, BalanceSchema } from '../wallet/schemas/balance.schema';
import {
  JournalEntry,
  JournalEntrySchema,
} from '../wallet/schemas/journal-entry.schema';
import {
  Transaction,
  TransactionSchema,
} from '../wallet/schemas/transaction.schema';
import { MongoService } from '../../common/services/internal/mongo.service';
import { RedisLockService } from '../../common/services/internal/redis-lock.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankWithdrawal.name, schema: BankWithdrawalSchema },
      { name: WalletWithdrawalOrder.name, schema: WalletWithdrawalOrderSchema },
      { name: Bank.name, schema: BankSchema },
      { name: Currency.name, schema: CurrencySchema },
      { name: Account.name, schema: AccountSchema },
      { name: Balance.name, schema: BalanceSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [WithdrawalController, WithdrawalAdminController],
  providers: [WithdrawalService, MongoService, RedisLockService],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
