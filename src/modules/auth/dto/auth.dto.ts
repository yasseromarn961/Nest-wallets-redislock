import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'User password',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token',
  })
  @IsString()
  refreshToken: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: 'Verification code' })
  @IsString()
  code: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Reset code received via email',
  })
  @IsString()
  code: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'New password',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class Verify2FADto {
  @ApiProperty({ example: '123456', description: '2FA verification code' })
  @IsString()
  code: string;
}

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;
}
