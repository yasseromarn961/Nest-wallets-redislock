import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BankDepositStatus } from '../schemas/bank-deposit.schema';

export class ProcessBankDepositDto {
  @ApiProperty({
    description: 'Approval status',
    enum: [BankDepositStatus.APPROVED, BankDepositStatus.REJECTED],
    example: BankDepositStatus.APPROVED,
  })
  @IsEnum([BankDepositStatus.APPROVED, BankDepositStatus.REJECTED])
  status: BankDepositStatus.APPROVED | BankDepositStatus.REJECTED;

  @ApiPropertyOptional({
    description: 'Rejection reason (required if status is REJECTED)',
    example: 'Invalid transfer receipt',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
