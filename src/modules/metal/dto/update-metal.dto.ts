import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';

export class MetalLocalizedNameUpdateDto {
  @ApiPropertyOptional({
    description: 'Metal name in English',
    example: 'Gold',
  })
  @IsString()
  @IsOptional()
  en?: string;

  @ApiPropertyOptional({
    description: 'Metal name in Arabic',
    example: 'ذهب',
  })
  @IsString()
  @IsOptional()
  ar?: string;
}

export class UpdateMetalDto {
  @ApiPropertyOptional({
    description: 'Localized metal name object',
    type: MetalLocalizedNameUpdateDto,
  })
  @ValidateNested()
  @Type(() => MetalLocalizedNameUpdateDto)
  @IsOptional()
  name?: MetalLocalizedNameUpdateDto;

  @ApiPropertyOptional({
    description: 'Metal symbol',
    example: 'XAU',
  })
  @IsString()
  @IsOptional()
  symbol?: string;

  @ApiPropertyOptional({
    description: 'Purity of the metal',
    example: '24',
  })
  @IsString()
  @IsOptional()
  purity?: string;

  @ApiPropertyOptional({ description: 'Is the metal active?' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AdminMetalQueryDto {
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
    example: 'gold',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by metal ID',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({
    description: 'Filter by symbol',
    example: 'XAU',
  })
  @IsString()
  @IsOptional()
  symbol?: string;

  @ApiPropertyOptional({
    description:
      'Filter by Currency ID (limits currencies array to the matched entry and populates it in response)',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsOptional()
  currencyId?: string;

  @ApiPropertyOptional({
    description: 'Filter by active state',
    example: true,
  })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Filter by deleted status: true returns soft-deleted records, false returns non-deleted records. If not provided, returns all records',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: TransformFnParams): boolean | undefined => {
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === 'true') return true;
      if (v === 'false') return false;
      if (v === '') return undefined;
      return undefined;
    }
    if (typeof value === 'boolean') return value;
    if (value === null || value === undefined) return undefined;
    return undefined;
  })
  isDeleted?: boolean;
}

export class PublicMetalQueryDto {
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
    example: 'gold',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by metal ID',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({
    description: 'Filter by symbol',
    example: 'XAU',
  })
  @IsString()
  @IsOptional()
  symbol?: string;

  @ApiPropertyOptional({
    description:
      'Filter by Currency ID (limits currencies array to the matched entry and populates it in response)',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsOptional()
  currencyId?: string;
}

export class PublicMetalByCurrencyQueryDto {
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
}

export class AdminMetalByCurrencyQueryDto {
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
    description:
      'Filter by currency pricing activation: true returns active pricing only, false returns inactive pricing only. If not provided, returns all pricing states',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: TransformFnParams): boolean | undefined => {
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === 'true') return true;
      if (v === 'false') return false;
      if (v === '') return undefined;
      return undefined;
    }
    if (typeof value === 'boolean') return value;
    if (value === null || value === undefined) return undefined;
    return undefined;
  })
  currencyActive?: boolean;
}
