import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  MaxLength,
} from 'class-validator';
import { MediaType } from '../schemas/media.schema';

export class GeneratePresignedUrlDto {
  @ApiProperty({
    description: 'Original filename',
    example: 'profile-picture.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({
    description: 'File MIME type',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({
    description: 'Media type category',
    enum: MediaType,
    example: MediaType.IMAGE,
  })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiPropertyOptional({
    description: 'Optional metadata',
    example: { description: 'User profile picture' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ConfirmUploadDto {
  @ApiProperty({
    description: 'S3 object key returned from presigned URL generation',
    example: 'media/user/2024/11/abc123.jpg',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'profile-picture.jpg',
  })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({
    description: 'File MIME type',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  @IsNotEmpty()
  size: number;

  @ApiProperty({
    description: 'Media type category',
    enum: MediaType,
    example: MediaType.IMAGE,
  })
  @IsEnum(MediaType)
  type: MediaType;

  @ApiPropertyOptional({
    description: 'Optional metadata',
    example: { description: 'User profile picture' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
