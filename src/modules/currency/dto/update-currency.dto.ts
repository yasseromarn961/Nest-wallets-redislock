import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CurrencyLocalizedNameUpdateDto {
  @ApiPropertyOptional({
    description: 'Currency name in English',
    example: 'US Dollar',
  })
  @IsString()
  @IsOptional()
  en?: string;

  @ApiPropertyOptional({
    description: 'Currency name in Arabic',
    example: 'دولار أمريكي',
  })
  @IsString()
  @IsOptional()
  ar?: string;
}

export class UpdateCurrencyDto {
  @ApiPropertyOptional({
    description: 'Localized currency name object',
    type: CurrencyLocalizedNameUpdateDto,
  })
  @ValidateNested()
  @Type(() => CurrencyLocalizedNameUpdateDto)
  @IsOptional()
  name?: CurrencyLocalizedNameUpdateDto;

  @ApiPropertyOptional({
    description: 'Currency symbol',
    example: 'USD',
  })
  @IsString()
  @IsOptional()
  symbol?: string;

  @ApiPropertyOptional({ description: 'Is the currency active?' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AdminCurrencyQueryDto {
  @ApiPropertyOptional({ description: 'Page number (0-indexed)', example: 0 })
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', example: 10 })
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Order direction for results',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDirection?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Search in name (en/ar) or symbol',
    example: 'usd',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active state',
    example: true,
  })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Include soft-deleted records',
    example: false,
  })
  @IsOptional()
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Return only soft-deleted records',
    example: false,
  })
  @IsOptional()
  deletedOnly?: boolean;
}

export class PublicCurrencyQueryDto {
  @ApiPropertyOptional({ description: 'Page number (0-indexed)', example: 0 })
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', example: 10 })
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Order direction for results',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDirection?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Search in name (en/ar) or symbol',
    example: 'usd',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
