import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CountryLocalizedNameDto {
  @ApiProperty({
    description: 'Country name in English',
    example: 'Saudi Arabia',
  })
  @IsString()
  @IsNotEmpty()
  en: string;

  @ApiProperty({
    description: 'Country name in Arabic',
    example: 'المملكة العربية السعودية',
  })
  @IsString()
  @IsNotEmpty()
  ar: string;
}

export class CreateCountryDto {
  @ApiProperty({
    description: 'Localized country name object',
    type: CountryLocalizedNameDto,
  })
  @ValidateNested()
  @Type(() => CountryLocalizedNameDto)
  name: CountryLocalizedNameDto;

  @ApiProperty({ description: 'ISO country code', example: 'SA' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'International dialing code', example: '+966' })
  @IsString()
  @IsNotEmpty()
  dialCode: string;

  @ApiProperty({
    description: 'URL of the flag image',
    example: 'https://example.com/flags/sa.svg',
  })
  @IsString()
  @IsUrl()
  flagImageUrl: string;

  @ApiPropertyOptional({ description: 'Is the country active?', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
