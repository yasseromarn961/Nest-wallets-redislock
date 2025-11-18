import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    description:
      'City ID (Mongo ObjectId) - Country and Region will be automatically extracted from the city',
    example: '60f7b2f6a8b1c60012d4c8e3',
  })
  @IsMongoId()
  @IsNotEmpty()
  cityId: string;

  @ApiProperty({
    description: 'Address line 1 (street, building number, etc.)',
    example: '123 Main Street, Building 5',
  })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

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
