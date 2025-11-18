import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FeeType as FeeTypeDto } from 'src/common/enums/index';
export class BankLocalizedNameDto {
  @ApiProperty({
    description: 'Bank name in English',
    example: 'National Bank',
  })
  @IsString()
  @IsNotEmpty()
  en: string;

  @ApiProperty({
    description: 'Bank name in Arabic',
    example: 'البنك الوطني',
  })
  @IsString()
  @IsNotEmpty()
  ar: string;
}

export class FeeStructureDto {
  @ApiProperty({
    description: 'Is fee enabled?',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;

  @ApiPropertyOptional({
    description: 'Fee type (required if enabled)',
    enum: FeeTypeDto,
    example: FeeTypeDto.PERCENTAGE,
  })
  @IsEnum(FeeTypeDto)
  @IsOptional()
  type?: FeeTypeDto;

  @ApiPropertyOptional({
    description: 'Percentage value (0-100)',
    example: 2.5,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  percentage?: number;

  @ApiPropertyOptional({
    description: 'Fixed amount value',
    example: 10,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  fixedAmount?: number;
}

export class CurrencyConfigDto {
  @ApiProperty({
    description: 'Currency ID (Mongo ObjectId)',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsNotEmpty()
  currencyId: string;

  @ApiPropertyOptional({
    description: 'Is deposit enabled for this currency?',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  depositEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Is withdrawal enabled for this currency?',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  withdrawEnabled?: boolean;

  @ApiProperty({
    description: 'Deposit fee structure for this currency',
    type: FeeStructureDto,
  })
  @ValidateNested()
  @Type(() => FeeStructureDto)
  depositFee: FeeStructureDto;

  @ApiProperty({
    description: 'Withdrawal fee structure for this currency',
    type: FeeStructureDto,
  })
  @ValidateNested()
  @Type(() => FeeStructureDto)
  withdrawFee: FeeStructureDto;

  @ApiProperty({
    description: 'Deposit tax structure for this currency',
    type: FeeStructureDto,
  })
  @ValidateNested()
  @Type(() => FeeStructureDto)
  depositTax: FeeStructureDto;

  @ApiProperty({
    description: 'Withdrawal tax structure for this currency',
    type: FeeStructureDto,
  })
  @ValidateNested()
  @Type(() => FeeStructureDto)
  withdrawTax: FeeStructureDto;
}

export class CreateBankDto {
  @ApiProperty({
    description: 'Localized bank name object',
    type: BankLocalizedNameDto,
  })
  @ValidateNested()
  @Type(() => BankLocalizedNameDto)
  name: BankLocalizedNameDto;

  @ApiProperty({
    description: 'Bank code (unique identifier)',
    example: 'NBK001',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description: 'Localized bank description',
    type: BankLocalizedNameDto,
  })
  @ValidateNested()
  @Type(() => BankLocalizedNameDto)
  @IsOptional()
  description?: BankLocalizedNameDto;

  @ApiPropertyOptional({
    description: 'Is deposit available for this bank?',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  depositAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Is withdrawal available for this bank?',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  withdrawAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Array of supported currencies',
    type: CurrencyConfigDto,
    isArray: true,
    example: [
      {
        currencyId: '60f7b2f6a8b1c60012d4c8e1',
        depositEnabled: true,
        withdrawEnabled: true,
        depositFee: {
          enabled: true,
          type: 'percentage',
          percentage: 2.5,
          fixedAmount: 10,
        },
        withdrawFee: {
          enabled: true,
          type: 'percentage',
          percentage: 2.5,
          fixedAmount: 10,
        },
        depositTax: {
          enabled: true,
          type: 'percentage',
          percentage: 5,
          fixedAmount: 5,
        },
        withdrawTax: {
          enabled: true,
          type: 'percentage',
          percentage: 5,
          fixedAmount: 5,
        },
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurrencyConfigDto)
  @IsOptional()
  currencies?: CurrencyConfigDto[];

  @ApiPropertyOptional({
    description: 'Is the bank active?',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
