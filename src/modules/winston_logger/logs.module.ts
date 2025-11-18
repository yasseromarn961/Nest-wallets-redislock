import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LogsService } from './logs.service';
import { LogsAdminController } from './logs.admin.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [LogsService],
  controllers: [LogsAdminController],
})
export class LogsModule {}
