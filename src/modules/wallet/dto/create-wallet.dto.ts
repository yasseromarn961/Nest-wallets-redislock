import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WalletSubtype {
  MAIN = 'MAIN',
  TRADING = 'TRADING',
}

export class CreateWalletDto {
  @ApiProperty({
    description: 'User ID owning the wallet',
    example: '64f1c2a3b4d5e6f7890abc12',
  })
  @IsMongoId()
  userId: string;

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
