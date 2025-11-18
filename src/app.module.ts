import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import {
  I18nModule,
  AcceptLanguageResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import { JwtLanguageResolver } from './common/i18n/jwt-language.resolver';
import { join } from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { CommonModule } from './common/common.module';
import { CountriesModule } from './modules/country/countries.module';
import { RegionsModule } from './modules/region/regions.module';
import { CitiesModule } from './modules/city/cities.module';
import { AddressModule } from './modules/address/address.module';
import { MediaModule } from './modules/media/media.module';
import { CurrenciesModule } from './modules/currency/currencies.module';
import { MetalsModule } from './modules/metal/metals.module';
import { BanksModule } from './modules/bank/banks.module';
import { LogsModule } from './modules/winston_logger/logs.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PaymentModule } from './modules/paytabs/paytabs.module';
import { BankDepositModule } from './modules/bank-deposit/bank-deposit.module';
import { WithdrawalModule } from './modules/withdrawal/withdrawal.module';
import configuration from './config/configuration';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { PaginationTransformInterceptor } from './common/interceptors/pagination-transform.interceptor';
import { LocalizationTransformInterceptor } from './common/interceptors/localization-transform.interceptor';
import { WinstonModule } from 'nest-winston';
import { createWinstonOptions } from './modules/winston_logger/logger/winston.logger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
      cache: true,
    }),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createWinstonOptions(configService),
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        AcceptLanguageResolver,
        { use: HeaderResolver, options: ['x-lang'] },
        JwtLanguageResolver,
      ],
    }),
    CommonModule,
    DatabaseModule,
    UsersModule,
    CountriesModule,
    RegionsModule,
    CitiesModule,
    CurrenciesModule,
    MetalsModule,
    BanksModule,
    AddressModule,
    MediaModule,
    AuthModule,
    AdminModule,
    LogsModule,
    WalletModule,
    PaymentModule,
    BankDepositModule,
    WithdrawalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LocalizationTransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseEnvelopeInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PaginationTransformInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
