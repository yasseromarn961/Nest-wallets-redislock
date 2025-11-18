import { Module, Global } from '@nestjs/common';
import { MailService } from './services/internal/mail.service';
import { RedisLockService } from './services/internal/redis-lock.service';
import { MongoConnectionLoggerService } from './services/internal/mongo-connection-logger.service';
import { RedisService } from './services/internal/redis.service';
import { MongoService } from './services/internal/mongo.service';

@Global()
@Module({
  providers: [
    MailService,
    RedisService,
    MongoService,
    RedisLockService,
    MongoConnectionLoggerService,
  ],
  exports: [
    MailService,
    RedisService,
    MongoService,
    RedisLockService,
    MongoConnectionLoggerService,
  ],
})
export class CommonModule {}
