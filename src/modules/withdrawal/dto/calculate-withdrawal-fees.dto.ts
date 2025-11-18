import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsMongoId, Min } from 'class-validator';

export class CalculateWithdrawalFeesDto {
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
    description: 'Withdrawal amount',
    example: 1000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class WithdrawalFeesCalculationResponseDto {
  @ApiProperty({ description: 'Original amount requested' })
  amount: number;

  @ApiProperty({ description: 'Tax amount to be deducted' })
  taxAmount: number;

  @ApiProperty({ description: 'Fee amount to be deducted' })
  feeAmount: number;

  @ApiProperty({ description: 'Net amount user will receive' })
  netAmount: number;

  @ApiProperty({ description: 'Total deductions (tax + fees)' })
  totalDeductions: number;

  @ApiProperty({ description: 'Currency symbol' })
  currencySymbol: string;

  @ApiProperty({ description: 'Bank name in English' })
  bankNameEn: string;

  @ApiProperty({ description: 'Bank name in Arabic' })
  bankNameAr: string;
}
