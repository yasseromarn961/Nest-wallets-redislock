import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsMongoId,
  IsUrl,
} from 'class-validator';

export class CreateBankDepositDto {
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

  @ApiPropertyOptional({
    description: 'URL of bank transfer image/receipt',
    example: 'https://example.com/receipts/transfer123.jpg',
  })
  @IsOptional()
  @IsUrl()
  transferImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Transaction reference number from the bank',
    example: 'TRX-2024-001234',
  })
  @IsOptional()
  @IsString()
  transactionReference?: string;
}
