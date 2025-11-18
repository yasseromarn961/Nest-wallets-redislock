import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CurrencyLocalizedNameDto {
  @ApiProperty({
    description: 'Currency name in English',
    example: 'US Dollar',
  })
  @IsString()
  @IsNotEmpty()
  en: string;

  @ApiProperty({
    description: 'Currency name in Arabic',
    example: 'دولار أمريكي',
  })
  @IsString()
  @IsNotEmpty()
  ar: string;
}

export class CreateCurrencyDto {
  @ApiProperty({
    description: 'Localized currency name object',
    type: CurrencyLocalizedNameDto,
  })
  @ValidateNested()
  @Type(() => CurrencyLocalizedNameDto)
  name: CurrencyLocalizedNameDto;

  @ApiProperty({
    description: 'Currency symbol',
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiPropertyOptional({
    description: 'Is the currency active?',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
