import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CityLocalizedNameUpdateDto {
  @ApiPropertyOptional({
    description: 'City name in English',
    example: 'Jeddah',
  })
  @IsString()
  @IsOptional()
  en?: string;

  @ApiPropertyOptional({ description: 'City name in Arabic', example: 'جدة' })
  @IsString()
  @IsOptional()
  ar?: string;
}

export class UpdateCityDto {
  @ApiPropertyOptional({
    description: 'Localized city name object',
    type: CityLocalizedNameUpdateDto,
  })
  @ValidateNested()
  @Type(() => CityLocalizedNameUpdateDto)
  @IsOptional()
  name?: CityLocalizedNameUpdateDto;

  @ApiPropertyOptional({
    description: 'Linked Country ID (Mongo ObjectId)',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsOptional()
  countryId?: string;

  @ApiPropertyOptional({
    description: 'Linked Region ID (Mongo ObjectId)',
    example: '60f7b2f6a8b1c60012d4c8e2',
  })
  @IsMongoId()
  @IsOptional()
  regionId?: string;

  @ApiPropertyOptional({
    description: 'Postal code for the city',
    example: '12345',
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Is the city active?' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AdminCityQueryDto {
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
    description: 'Search in name (en/ar)',
    example: 'jed',
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

  @ApiPropertyOptional({
    description: 'Filter by Country ID',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsOptional()
  countryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Region ID',
    example: '60f7b2f6a8b1c60012d4c8e2',
  })
  @IsMongoId()
  @IsOptional()
  regionId?: string;
}

export class PublicCityQueryDto {
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
    description: 'Search in name (en/ar)',
    example: 'jed',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by Country ID',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsOptional()
  countryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by Region ID',
    example: '60f7b2f6a8b1c60012d4c8e2',
  })
  @IsMongoId()
  @IsOptional()
  regionId?: string;
}
