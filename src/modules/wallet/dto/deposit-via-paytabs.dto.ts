import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerDetailsInputDto } from '../../paytabs/dto/paytabs.dto';

export class DepositViaPayTabsDto {
  @ApiProperty({
    description: 'Currency ID for payment',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  currencyId: string;

  @ApiProperty({ description: 'Deposit amount (positive)', example: 100 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Customer details for PayTabs' })
  @ValidateNested()
  @Type(() => CustomerDetailsInputDto)
  customerDetails: CustomerDetailsInputDto;

  @ApiProperty({
    description: 'Return URL after payment',
    example: 'https://example.com/payment-success',
  })
  @IsString()
  @IsNotEmpty()
  returnUrl: string;
}
