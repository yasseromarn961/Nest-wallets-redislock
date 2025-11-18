import {
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportedLanguage } from '../../../common/enums';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'John',
    description: 'first name of the user',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'last name of the user',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: '+966501234567',
    description: 'phone number of the user',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    enum: SupportedLanguage,
    example: SupportedLanguage.EN,
    description: 'preferred language',
  })
  @IsEnum(SupportedLanguage)
  @IsOptional()
  language?: SupportedLanguage;

  @ApiPropertyOptional({
    example: false,
    description: 'enable two-factor authentication',
  })
  @IsBoolean()
  @IsOptional()
  isTwoFactorEnabled?: boolean;
}

export class UpdatePasswordDto {
  @ApiProperty({
    example: 'oldPassword123',
    description: 'current password',
  })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'new password (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
