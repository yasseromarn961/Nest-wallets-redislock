import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DepositDto {
  @ApiProperty({
    description: 'Target wallet Account ID',
    example: '64f1c2a3b4d5e6f7890abc12',
  })
  @IsMongoId()
  walletAccountId: string;

  @ApiProperty({ description: 'Asset symbol to deposit', example: 'USD' })
  @IsString()
  @IsNotEmpty()
  assetSymbol: string;

  @ApiProperty({ description: 'Deposit amount (positive)', example: 100 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Idempotency key to prevent duplicates',
    example: 'dep-2025-11-14-abc123',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
