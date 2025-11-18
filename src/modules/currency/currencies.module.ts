import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CurrenciesService } from './currencies.service';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesAdminController } from './currencies.admin.controller';
import { Currency, CurrencySchema } from './schemas/currency.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Currency.name, schema: CurrencySchema },
    ]),
  ],
  // Register admin controller first to ensure '/currencies/admin' is matched before '/currencies/:id'
  controllers: [CurrenciesAdminController, CurrenciesController],
  providers: [CurrenciesService],
  exports: [CurrenciesService, MongooseModule],
})
export class CurrenciesModule {}
