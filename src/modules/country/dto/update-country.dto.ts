import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsIn,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CountryLocalizedNameUpdateDto {
  @ApiPropertyOptional({
    description: 'Country name in English',
    example: 'Saudi Arabia',
  })
  @IsString()
  @IsOptional()
  en?: string;

  @ApiPropertyOptional({
    description: 'Country name in Arabic',
    example: 'المملكة العربية السعودية',
  })
  @IsString()
  @IsOptional()
  ar?: string;
}

export class UpdateCountryDto {
  @ApiPropertyOptional({
    description: 'Localized country name object',
    type: CountryLocalizedNameUpdateDto,
  })
  @ValidateNested()
  @Type(() => CountryLocalizedNameUpdateDto)
  @IsOptional()
  name?: CountryLocalizedNameUpdateDto;

  @ApiPropertyOptional({ description: 'ISO country code', example: 'SA' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'International dialing code',
    example: '+966',
  })
  @IsString()
  @IsOptional()
  dialCode?: string;

  @ApiPropertyOptional({
    description: 'URL of the flag image',
    example: 'https://example.com/flags/sa.svg',
  })
  @IsString()
  @IsUrl()
  @IsOptional()
  flagImageUrl?: string;

  @ApiPropertyOptional({ description: 'Is the country active?' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AdminCountryQueryDto {
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
    description: 'Search in name (en/ar), code, or dialCode',
    example: 'sa',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active state', example: true })
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

  @ApiPropertyOptional({ description: 'Filter by country code', example: 'SA' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'Filter by dial code', example: '+966' })
  @IsString()
  @IsOptional()
  dialCode?: string;
}

export class PublicCountryQueryDto {
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
    description: 'Search in name (en/ar), code, or dialCode',
    example: 'sa',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
