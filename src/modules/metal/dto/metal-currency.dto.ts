import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class LinkMetalCurrencyDto {
  @ApiProperty({
    description: 'Currency ID (Mongo ObjectId)',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsNotEmpty()
  currencyId: string;

  @ApiProperty({
    description: 'Price in the specified currency',
    example: 1850.5,
  })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiPropertyOptional({
    description: 'Is pricing active for this currency?',
    default: true,
  })
  @IsBoolean()
  currencyActive?: boolean = true;
}

export class ToggleCurrencyActivationDto {
  @ApiProperty({ description: 'Whether the currency pricing is active' })
  @IsBoolean()
  currencyActive: boolean;

  @ApiPropertyOptional({
    description: 'Optional new price for the currency pricing',
    example: 1900.75,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
