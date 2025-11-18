import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class LogsQueryDto {
  @ApiPropertyOptional({ description: 'Log level', example: 'error' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({
    description: 'Application/service context (logger context)',
    example: 'AuthService',
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({
    description: 'Event type (domain-specific)',
    example: 'http_exception',
  })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({
    description: 'Request correlation id',
    example: '42fc76cc-fe3b-4b77-8683-b1a4f4965a92',
  })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional({ description: 'HTTP method', example: 'POST' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'HTTP status code', example: 401 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  statusCode?: number;

  @ApiPropertyOptional({
    description: 'Request URL (supports partial match)',
    example: '/auth/login',
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Service name emitting the log',
    example: 'Nest RedisLock-backend',
  })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({ description: 'Environment', example: 'development' })
  @IsOptional()
  @IsString()
  env?: string;

  @ApiPropertyOptional({ description: 'Client IP', example: '::1' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional({ description: 'Language', example: 'en' })
  @IsOptional()
  @IsString()
  lang?: string;

  @ApiPropertyOptional({
    description:
      'Search keyword applied to message, error.message, url, context, and event',
    example: 'Invalid email',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by message (exact or partial match)',
    example: 'Unhandled exception',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Start of date/time range (ISO 8601)',
    example: '2025-11-11T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End of date/time range (ISO 8601)',
    example: '2025-11-12T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Page number (0-indexed)', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page (max 200)', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['timestamp', 'statusCode', 'level'],
    example: 'timestamp',
  })
  @IsOptional()
  @IsIn(['timestamp', 'statusCode', 'level'])
  orderBy?: 'timestamp' | 'statusCode' | 'level';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDirection?: 'asc' | 'desc';
}
