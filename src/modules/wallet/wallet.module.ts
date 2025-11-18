import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { WalletAdminController } from './wallet.admin.controller';
import { Account, AccountSchema } from './schemas/account.schema';
import { Balance, BalanceSchema } from './schemas/balance.schema';
import {
  JournalEntry,
  JournalEntrySchema,
} from './schemas/journal-entry.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import {
  WalletDepositOrder,
  WalletDepositOrderSchema,
} from './schemas/wallet-deposit-order.schema';
import { Currency, CurrencySchema } from '../currency/schemas/currency.schema';
import { Payment, PaymentSchema } from '../paytabs/schemas/paytabs.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Balance.name, schema: BalanceSchema },
      { name: JournalEntry.name, schema: JournalEntrySchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: WalletDepositOrder.name, schema: WalletDepositOrderSchema },
      { name: Currency.name, schema: CurrencySchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [WalletAdminController, WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
