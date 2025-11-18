import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletSubtype } from './create-wallet.dto';

export class CreateMyWalletDto {
  @ApiProperty({
    description: 'Wallet subtype',
    enum: WalletSubtype,
    example: WalletSubtype.MAIN,
  })
  @IsEnum(WalletSubtype)
  subtype: WalletSubtype;

  @ApiPropertyOptional({
    description: 'Optional wallet display name',
    example: 'Primary Funding Wallet',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
