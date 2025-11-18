import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FeeType as FeeTypeDto } from 'src/common/enums/index';

export class BankLocalizedNameUpdateDto {
  @ApiPropertyOptional({
    description: 'Bank name in English',
    example: 'National Bank',
  })
  @IsString()
  @IsOptional()
  en?: string;

  @ApiPropertyOptional({
    description: 'Bank name in Arabic',
    example: 'البنك الوطني',
  })
  @IsString()
  @IsOptional()
  ar?: string;
}

export class FeeStructureUpdateDto {
  @ApiPropertyOptional({
    description: 'Is fee enabled?',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Fee type',
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

export class CurrencyConfigUpdateDto {
  @ApiPropertyOptional({
    description: 'Currency ID (Mongo ObjectId)',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsOptional()
  currencyId?: string;

  @ApiPropertyOptional({
    description: 'Is deposit enabled for this currency?',
  })
  @IsBoolean()
  @IsOptional()
  depositEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Is withdrawal enabled for this currency?',
  })
  @IsBoolean()
  @IsOptional()
  withdrawEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Deposit fee structure for this currency',
    type: FeeStructureUpdateDto,
  })
  @ValidateNested()
  @Type(() => FeeStructureUpdateDto)
  @IsOptional()
  depositFee?: FeeStructureUpdateDto;

  @ApiPropertyOptional({
    description: 'Withdrawal fee structure for this currency',
    type: FeeStructureUpdateDto,
  })
  @ValidateNested()
  @Type(() => FeeStructureUpdateDto)
  @IsOptional()
  withdrawFee?: FeeStructureUpdateDto;

  @ApiPropertyOptional({
    description: 'Deposit tax structure for this currency',
    type: FeeStructureUpdateDto,
  })
  @ValidateNested()
  @Type(() => FeeStructureUpdateDto)
  @IsOptional()
  depositTax?: FeeStructureUpdateDto;

  @ApiPropertyOptional({
    description: 'Withdrawal tax structure for this currency',
    type: FeeStructureUpdateDto,
  })
  @ValidateNested()
  @Type(() => FeeStructureUpdateDto)
  @IsOptional()
  withdrawTax?: FeeStructureUpdateDto;
}

export class UpdateBankDto {
  @ApiPropertyOptional({
    description: 'Localized bank name object',
    type: BankLocalizedNameUpdateDto,
  })
  @ValidateNested()
  @Type(() => BankLocalizedNameUpdateDto)
  @IsOptional()
  name?: BankLocalizedNameUpdateDto;

  @ApiPropertyOptional({
    description: 'Bank code (unique identifier)',
    example: 'NBK001',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'Localized bank description',
    type: BankLocalizedNameUpdateDto,
  })
  @ValidateNested()
  @Type(() => BankLocalizedNameUpdateDto)
  @IsOptional()
  description?: BankLocalizedNameUpdateDto;

  @ApiPropertyOptional({
    description: 'Is deposit available for this bank?',
  })
  @IsBoolean()
  @IsOptional()
  depositAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Is withdrawal available for this bank?',
  })
  @IsBoolean()
  @IsOptional()
  withdrawAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Array of supported currencies (replaces entire array)',
    type: [CurrencyConfigUpdateDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurrencyConfigUpdateDto)
  @IsOptional()
  currencies?: CurrencyConfigUpdateDto[];

  @ApiPropertyOptional({
    description: 'Is the bank active?',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AdminBankQueryDto {
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
    description: 'Search in name (en/ar) or code',
    example: 'national',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by bank ID',
    example: '60f7b2f6a8b1c60012d4c8e1',
  })
  @IsMongoId()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({
    description: 'Filter by code',
    example: 'NBK001',
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({
    description: 'Filter by active state',
    example: true,
  })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by deposit availability',
    example: true,
  })
  @IsOptional()
  depositAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by withdrawal availability',
    example: true,
  })
  @IsOptional()
  withdrawAvailable?: boolean;

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

export class PublicBankQueryDto {
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
    description: 'Filter by deposit availability',
    example: true,
  })
  @IsOptional()
  depositAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by withdrawal availability',
    example: true,
  })
  @IsOptional()
  withdrawAvailable?: boolean;
}
