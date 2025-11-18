import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LogErrorDto {
  @ApiPropertyOptional({ example: 'UnauthorizedException' })
  name?: string;

  @ApiPropertyOptional({
    example:
      'Invalid email or password. Please check your credentials and try again.',
  })
  message?: string;

  @ApiPropertyOptional({ example: 'Unauthorized' })
  error?: string;

  @ApiPropertyOptional({ example: 'stacktrace...' })
  stack?: string;
}

export class LogItemDto {
  @ApiProperty({ example: '69135837c1928f422c8909e4' })
  _id!: string;

  @ApiProperty({
    description: 'Timestamp',
    example: '2025-11-11T15:37:07.867Z',
  })
  timestamp!: string;

  @ApiPropertyOptional({ example: '2025-11-11T15:37:07.867Z' })
  createdAt?: string;

  @ApiProperty({ example: 'error' })
  level!: string;

  @ApiPropertyOptional({ example: 'Request errored' })
  message?: string;

  @ApiPropertyOptional({ example: 'http_exception' })
  event?: string;

  @ApiPropertyOptional({ example: 'POST' })
  method?: string;

  @ApiPropertyOptional({ example: '/auth/login' })
  url?: string;

  @ApiPropertyOptional({ example: 401 })
  statusCode?: number;

  @ApiPropertyOptional({ example: 336 })
  durationMs?: number;

  @ApiPropertyOptional({ example: '::1' })
  ip?: string;

  @ApiPropertyOptional({
    example:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/...',
  })
  userAgent?: string;

  @ApiPropertyOptional({ example: 'en' })
  lang?: string;

  @ApiPropertyOptional({ example: '42fc76cc-fe3b-4b77-8683-b1a4f4965a92' })
  requestId?: string;

  @ApiPropertyOptional({ example: 'development' })
  env?: string;

  @ApiPropertyOptional({ example: 'Nest RedisLock-backend' })
  service?: string;

  @ApiPropertyOptional({ example: '17628754478880_0' })
  batchId?: string;

  @ApiPropertyOptional({ example: 'timeout' })
  flushReason?: string;

  @ApiPropertyOptional({ type: LogErrorDto })
  error?: LogErrorDto;
}

export class PaginatedLogsResponseDto {
  @ApiProperty({ type: [LogItemDto] })
  items!: LogItemDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 154 })
  total!: number;
}
