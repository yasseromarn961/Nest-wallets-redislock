import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BanksService } from './banks.service';
import { BanksController } from './banks.controller';
import { BanksAdminController } from './banks.admin.controller';
import { Bank, BankSchema } from './schemas/bank.schema';
import { CurrenciesModule } from '../currency/currencies.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Bank.name, schema: BankSchema }]),
    CurrenciesModule,
  ],
  // Register admin controller first to ensure '/banks/admin' is matched before '/banks/:id'
  controllers: [BanksAdminController, BanksController],
  providers: [BanksService],
  exports: [BanksService],
})
export class BanksModule {}
