import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BankDepositService } from './bank-deposit.service';
import { BankDepositController } from './bank-deposit.controller';
import { BankDepositAdminController } from './bank-deposit.admin.controller';
import { BankDeposit, BankDepositSchema } from './schemas/bank-deposit.schema';
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
import {
  WalletDepositOrder,
  WalletDepositOrderSchema,
} from '../wallet/schemas/wallet-deposit-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BankDeposit.name, schema: BankDepositSchema },
      { name: Bank.name, schema: BankSchema },
      { name: Currency.name, schema: CurrencySchema },
      { name: Account.name, schema: AccountSchema },
      { name: Balance.name, schema: BalanceSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: WalletDepositOrder.name, schema: WalletDepositOrderSchema },
    ]),
  ],
  controllers: [BankDepositController, BankDepositAdminController],
  providers: [BankDepositService],
  exports: [BankDepositService],
})
export class BankDepositModule {}
