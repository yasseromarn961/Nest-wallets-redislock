import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetTransactionsReportDto {
  @ApiPropertyOptional({ description: 'Asset symbol filter', example: 'USD' })
  @IsOptional()
  @IsString()
  assetSymbol?: string;

  @ApiPropertyOptional({
    description: 'Start date (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO 8601)',
    example: '2025-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Limit results',
    example: 100,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
