import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsMongoId, Min } from 'class-validator';

export class CalculateDepositFeesDto {
  @ApiProperty({
    description: 'Bank ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  bankId: string;

  @ApiProperty({
    description: 'Currency ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  currencyId: string;

  @ApiProperty({
    description: 'Deposit amount',
    example: 1000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class DepositFeesCalculationResponseDto {
  @ApiProperty({
    description: 'Original deposit amount',
    example: 1000,
  })
  amount: number;

  @ApiProperty({
    description: 'Tax amount',
    example: 150,
  })
  taxAmount: number;

  @ApiProperty({
    description: 'Fee amount',
    example: 25,
  })
  feeAmount: number;

  @ApiProperty({
    description: 'Net amount after deducting tax and fees',
    example: 825,
  })
  netAmount: number;

  @ApiProperty({
    description: 'Total deductions (tax + fees)',
    example: 175,
  })
  totalDeductions: number;

  @ApiProperty({
    description: 'Currency symbol',
    example: 'SAR',
  })
  currencySymbol: string;

  @ApiProperty({
    description: 'Bank name in English',
    example: 'Al Rajhi Bank',
  })
  bankNameEn: string;

  @ApiProperty({
    description: 'Bank name in Arabic',
    example: 'مصرف الراجحي',
  })
  bankNameAr: string;
}
