import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/paytabs.schema';
import { Currency, CurrencySchema } from '../currency/schemas/currency.schema';
import {
  WalletDepositOrder,
  WalletDepositOrderSchema,
} from '../wallet/schemas/wallet-deposit-order.schema';
import { PayTabsService } from './paytabs.service';
import { PayTabsController } from './paytabs.controller';
import { PayTabsWebhookController } from './paytabs.webhook.controller';
import { AdminPayTabsController } from './paytabs.admin.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Currency.name, schema: CurrencySchema },
      { name: WalletDepositOrder.name, schema: WalletDepositOrderSchema },
    ]),
    forwardRef(() => WalletModule),
  ],
  controllers: [
    PayTabsController,
    PayTabsWebhookController,
    AdminPayTabsController,
  ],
  providers: [PayTabsService],
  exports: [PayTabsService],
})
export class PaymentModule {}
