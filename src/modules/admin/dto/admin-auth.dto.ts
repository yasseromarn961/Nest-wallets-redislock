import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Admin email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'adminPass123',
    description: 'Admin password',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class AdminRefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token',
  })
  @IsString()
  refreshToken: string;
}

export class AdminVerify2FADto {
  @ApiProperty({ example: '123456', description: '2FA verification code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Temporary token from login',
  })
  @IsString()
  @IsOptional()
  tempToken?: string;
}
