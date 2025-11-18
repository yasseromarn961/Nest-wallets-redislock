import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupportedLanguage, UserType } from '../../../common/enums';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password (minimum 6 characters)',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'John', description: 'User first name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'User last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: '+966501234567',
    description: 'User phone number',
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    enum: SupportedLanguage,
    example: SupportedLanguage.EN,
    description: 'Preferred language',
  })
  @IsEnum(SupportedLanguage)
  @IsOptional()
  language?: SupportedLanguage;

  @ApiPropertyOptional({
    enum: UserType,
    example: UserType.REGISTERED,
    description: 'User type',
  })
  @IsEnum(UserType)
  @IsOptional()
  userType?: UserType;
}
