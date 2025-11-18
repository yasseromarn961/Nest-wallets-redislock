import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { FeeType } from 'src/common/enums/index';
import { Type } from 'class-transformer';

export enum FeeOperationType {
  DEPOSIT_FEE = 'depositFee',
  WITHDRAW_FEE = 'withdrawFee',
  DEPOSIT_TAX = 'depositTax',
  WITHDRAW_TAX = 'withdrawTax',
}

export class UpdateFeeDto {
  @ApiProperty({
    description: 'Whether the fee/tax is enabled',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: 'Type of fee calculation',
    enum: FeeType,
    example: FeeType.PERCENTAGE,
    required: false,
  })
  @IsOptional()
  @IsEnum(FeeType)
  type?: FeeType;

  @ApiProperty({
    description: 'Percentage value (0-100)',
    example: 2.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  percentage?: number;

  @ApiProperty({
    description: 'Fixed amount value',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  fixedAmount?: number;
}
