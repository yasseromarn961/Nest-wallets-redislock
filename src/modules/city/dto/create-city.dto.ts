import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CityLocalizedNameDto {
  @ApiProperty({ description: 'City name in English', example: 'Jeddah' })
  @IsString()
  @IsNotEmpty()
  en: string;

  @ApiProperty({ description: 'City name in Arabic', example: 'جدة' })
  @IsString()
  @IsNotEmpty()
  ar: string;
}

export class CreateCityDto {
  @ApiProperty({
    description: 'Localized city name object',
    type: CityLocalizedNameDto,
  })
  @ValidateNested()
  @Type(() => CityLocalizedNameDto)
  name: CityLocalizedNameDto;

  @ApiProperty({
    description: 'Linked Country ID (Mongo ObjectId)',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsNotEmpty()
  countryId: string;

  @ApiProperty({
    description: 'Linked Region ID (Mongo ObjectId)',
    example: '60f7b2f6a8b1c60012d4c8e2',
  })
  @IsMongoId()
  @IsNotEmpty()
  regionId: string;

  @ApiPropertyOptional({
    description: 'Postal code for the city',
    example: '12345',
  })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Is the city active?', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
