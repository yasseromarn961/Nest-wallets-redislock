import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  IsMongoId,
} from 'class-validator';

export class CreateWithdrawalRequestDto {
  @ApiProperty({
    description: 'Bank ID for withdrawal',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  bankId: string;

  @ApiProperty({
    description: 'Currency ID for withdrawal',
    example: '507f1f77bcf86cd799439012',
  })
  @IsMongoId()
  currencyId: string;

  @ApiProperty({
    description: 'Withdrawal amount',
    example: 500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: 'Additional notes from user',
    example: 'Urgent withdrawal needed',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
