import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsDateString } from 'class-validator';
import { BankDepositStatus } from '../schemas/bank-deposit.schema';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class QueryBankDepositDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: BankDepositStatus,
    example: BankDepositStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(BankDepositStatus)
  status?: BankDepositStatus;

  @ApiPropertyOptional({
    description: 'Filter by bank ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  bankId?: string;

  @ApiPropertyOptional({
    description: 'Filter by currency ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId()
  currencyId?: string;

  @ApiPropertyOptional({
    description: 'Filter from date (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class AdminQueryBankDepositDto extends QueryBankDepositDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID (Admin only)',
    example: '507f1f77bcf86cd799439013',
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by processed admin ID',
    example: '507f1f77bcf86cd799439014',
  })
  @IsOptional()
  @IsMongoId()
  processedBy?: string;
}
