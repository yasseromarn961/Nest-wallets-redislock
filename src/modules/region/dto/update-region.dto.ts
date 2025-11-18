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

export class RegionLocalizedNameUpdateDto {
  @ApiPropertyOptional({
    description: 'Region name in English',
    example: 'Riyadh',
  })
  @IsString()
  @IsOptional()
  en?: string;

  @ApiPropertyOptional({
    description: 'Region name in Arabic',
    example: 'الرياض',
  })
  @IsString()
  @IsOptional()
  ar?: string;
}

export class UpdateRegionDto {
  @ApiPropertyOptional({
    description: 'Localized region name object',
    type: RegionLocalizedNameUpdateDto,
  })
  @ValidateNested()
  @Type(() => RegionLocalizedNameUpdateDto)
  @IsOptional()
  name?: RegionLocalizedNameUpdateDto;

  @ApiPropertyOptional({
    description: 'Linked Country ID (Mongo ObjectId)',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsOptional()
  countryId?: string;

  @ApiPropertyOptional({ description: 'Is the region active?' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AdminRegionQueryDto {
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
    example: 'riy',
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
}

export class PublicRegionQueryDto {
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
    example: 'riy',
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
}
