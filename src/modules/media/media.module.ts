import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaAdminController } from './media.admin.controller';
import { Media, MediaSchema } from './schemas/media.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]),
    ConfigModule,
  ],
  controllers: [MediaController, MediaAdminController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
