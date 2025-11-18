import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MetalsService } from './metals.service';
import { MetalsController } from './metals.controller';
import { MetalsAdminController } from './metals.admin.controller';
import { Metal, MetalSchema } from './schemas/metal.schema';
import { CurrenciesModule } from '../currency/currencies.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Metal.name, schema: MetalSchema }]),
    CurrenciesModule,
  ],
  // Register admin controller first to ensure '/metals/admin' and '/metals/by-currency' are matched before '/metals/:id'
  controllers: [MetalsAdminController, MetalsController],
  providers: [MetalsService],
  exports: [MetalsService],
})
export class MetalsModule {}
