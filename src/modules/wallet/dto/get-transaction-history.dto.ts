import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTransactionHistoryDto {
  @ApiPropertyOptional({ description: 'Asset symbol filter', example: 'USD' })
  @IsOptional()
  @IsString()
  assetSymbol?: string;

  @ApiPropertyOptional({
    description: 'Limit results',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
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
