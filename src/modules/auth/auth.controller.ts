import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import {
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendVerificationDto,
} from './dto/auth.dto';
import { UpdatePasswordDto } from '../users/dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { extractBrowserInfoFromRequest } from '../../common/utils/browser-info';
import { Request as ExpressRequest } from 'express';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { ApiSort } from '../../common/decorators/api-sort.decorator';

// i18n is handled in services; controllers remain thin

interface JwtUserPayload {
  id: string;
  lang?: string;
  language?: string;
}

type AuthenticatedRequest = ExpressRequest & { user?: JwtUserPayload };
type AuthenticatedRequestWithUser = ExpressRequest & { user: JwtUserPayload };

@ApiTags('003- User Authentication')
@ApiAcceptLanguage()
@SkipEnvelope()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @ApiSort(1)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({
    status: 401,
    description:
      'Invalid email or password. Please check your credentials and try again.',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const browserInfo = extractBrowserInfoFromRequest(req);
    return this.authService.login(loginDto, req.ip, browserInfo);
  }

  @Post('refresh')
  @ApiSort(2)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiSort(3)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Request() req: AuthenticatedRequestWithUser,
  ) {
    await this.authService.logout(req.user.id, refreshTokenDto.refreshToken);
  }

  @Post('verify-email')
  @ApiSort(4)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.usersService.verifyEmail(
      verifyEmailDto.email,
      verifyEmailDto.code,
    );
  }

  @Post('forgot-password')
  @ApiSort(5)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset code' })
  @ApiResponse({ status: 200, description: 'Reset code sent to email' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.handleForgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiSort(6)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with code' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.code,
      resetPasswordDto.newPassword,
    );
  }

  @Post('resend-verification')
  @ApiSort(7)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification code' })
  @ApiResponse({
    status: 200,
    description: 'Verification code resent successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.handleResendVerification(resendDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-password')
  @ApiSort(8)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Update user password (requires user token)' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Invalid old password' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiBody({
    type: UpdatePasswordDto,
    description: 'Provide the old and new passwords to update',
  })
  async updatePassword(
    @Request() req: AuthenticatedRequestWithUser,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.authService.updatePassword(req.user.id, updatePasswordDto);
  }
}
