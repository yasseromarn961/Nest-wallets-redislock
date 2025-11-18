import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MetalLocalizedNameDto {
  @ApiProperty({
    description: 'Metal name in English',
    example: 'Gold',
  })
  @IsString()
  @IsNotEmpty()
  en: string;

  @ApiProperty({
    description: 'Metal name in Arabic',
    example: 'ذهب',
  })
  @IsString()
  @IsNotEmpty()
  ar: string;
}

export class CreateMetalDto {
  @ApiProperty({
    description: 'Localized metal name object',
    type: MetalLocalizedNameDto,
  })
  @ValidateNested()
  @Type(() => MetalLocalizedNameDto)
  name: MetalLocalizedNameDto;

  @ApiProperty({
    description: 'Metal symbol',
    example: 'XAU',
  })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({
    description: 'Purity of the metal',
    example: '24',
  })
  @IsString()
  @IsNotEmpty()
  purity: string;

  @ApiPropertyOptional({
    description: 'Is the metal active?',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
