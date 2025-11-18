import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl } from 'class-validator';

export class ApproveWithdrawalDto {
  @ApiPropertyOptional({
    description: 'Admin notes for approval',
    example: 'Approved - documents verified',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class RejectWithdrawalDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Insufficient documentation provided',
  })
  @IsString()
  rejectionReason: string;

  @ApiPropertyOptional({
    description: 'Admin notes',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class CompleteWithdrawalDto {
  @ApiProperty({
    description: 'Transaction reference from bank',
    example: 'TRX-WITHDRAW-2024-001234',
  })
  @IsString()
  transactionReference: string;

  @ApiPropertyOptional({
    description: 'URL of transfer receipt/proof',
    example: 'https://example.com/receipts/withdrawal123.jpg',
  })
  @IsOptional()
  @IsUrl()
  transferReceiptUrl?: string;

  @ApiPropertyOptional({
    description: 'Admin notes for completion',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class CancelWithdrawalDto {
  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Unable to process - bank account issue',
  })
  @IsString()
  cancellationReason: string;

  @ApiPropertyOptional({
    description: 'Admin notes',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
