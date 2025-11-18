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

export class RegionLocalizedNameDto {
  @ApiProperty({ description: 'Region name in English', example: 'Riyadh' })
  @IsString()
  @IsNotEmpty()
  en: string;

  @ApiProperty({ description: 'Region name in Arabic', example: 'الرياض' })
  @IsString()
  @IsNotEmpty()
  ar: string;
}

export class CreateRegionDto {
  @ApiProperty({
    description: 'Localized region name object',
    type: RegionLocalizedNameDto,
  })
  @ValidateNested()
  @Type(() => RegionLocalizedNameDto)
  name: RegionLocalizedNameDto;

  @ApiProperty({
    description: 'Linked Country ID (Mongo ObjectId)',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsNotEmpty()
  countryId: string;

  @ApiPropertyOptional({ description: 'Is the region active?', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
