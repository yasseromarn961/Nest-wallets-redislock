import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsMongoId, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { BankWithdrawalStatus } from '../schemas/bank-withdrawal.schema';

export class QueryWithdrawalDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: BankWithdrawalStatus,
  })
  @IsOptional()
  @IsEnum(BankWithdrawalStatus)
  status?: BankWithdrawalStatus;

  @ApiPropertyOptional({
    description: 'Filter by bank ID',
  })
  @IsOptional()
  @IsMongoId()
  bankId?: string;

  @ApiPropertyOptional({
    description: 'Filter by currency ID',
  })
  @IsOptional()
  @IsMongoId()
  currencyId?: string;

  @ApiPropertyOptional({
    description: 'Filter from date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class AdminQueryWithdrawalDto extends QueryWithdrawalDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by processed by admin ID',
  })
  @IsOptional()
  @IsMongoId()
  processedBy?: string;

  @ApiPropertyOptional({
    description: 'Filter by completed by admin ID',
  })
  @IsOptional()
  @IsMongoId()
  completedBy?: string;
}
