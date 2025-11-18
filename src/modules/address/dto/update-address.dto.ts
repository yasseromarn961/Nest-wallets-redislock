import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAddressDto {
  @ApiPropertyOptional({
    description:
      'City ID (Mongo ObjectId) - Country and Region will be automatically extracted from the city',
    example: '60f7b2f6a8b1c60012d4c8e3',
  })
  @IsMongoId()
  @IsOptional()
  cityId?: string;

  @ApiPropertyOptional({
    description: 'Address line 1 (street, building number, etc.)',
    example: '123 Main Street, Building 5',
  })
  @IsString()
  @IsOptional()
  addressLine1?: string;

  @ApiPropertyOptional({
    description: 'Address line 2 (apartment, floor, etc.)',
    example: 'Apartment 12, Floor 3',
  })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiPropertyOptional({
    description: 'Postal code / Zip code',
    example: '12345',
  })
  @IsString()
  @IsOptional()
  postalCode?: string;
}

export class AdminAddressQueryDto {
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
    description: 'Filter by User ID',
    example: '60f7b2f6a8b1c60012d4c8e0',
  })
  @IsMongoId()
  @IsOptional()
  userId?: string;

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

  @ApiPropertyOptional({
    description: 'Filter by City ID',
    example: '60f7b2f6a8b1c60012d4c8e3',
  })
  @IsMongoId()
  @IsOptional()
  cityId?: string;

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
