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
} from '@nestjs/swagger';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';
import { AdminAuthService } from './admin-auth.service';
import {
  AdminLoginDto,
  AdminRefreshTokenDto,
  AdminVerify2FADto,
} from './dto/admin-auth.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { ApiSort } from '../../common/decorators/api-sort.decorator';

@ApiTags('002- Admin Authentication')
@ApiAcceptLanguage()
@SkipEnvelope()
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @ApiSort(1)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login (returns temp token if 2FA enabled)' })
  @ApiResponse({ status: 200, description: 'Login successful or 2FA required' })
  @ApiResponse({
    status: 401,
    description:
      'Invalid email or password. Please check your credentials and try again.',
  })
  async login(@Body() loginDto: AdminLoginDto, @Request() req: any) {
    return this.adminAuthService.login(loginDto, req.ip);
  }

  @Post('refresh')
  @ApiSort(2)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh admin access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() refreshTokenDto: AdminRefreshTokenDto) {
    return this.adminAuthService.refreshAccessToken(
      refreshTokenDto.refreshToken,
    );
  }

  @Post('verify-2fa')
  @ApiSort(4)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 2FA code and get access tokens' })
  @ApiResponse({ status: 200, description: '2FA verified successfully' })
  @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
  async verify2FA(
    @Body() verify2FADto: AdminVerify2FADto,
    @Request() req: any,
  ) {
    // tempToken should be sent in Authorization header or body
    const tempToken =
      verify2FADto.tempToken ||
      req.headers?.authorization?.replace('Bearer ', '');
    return this.adminAuthService.verify2FA(
      tempToken,
      verify2FADto.code,
      req.ip,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('logout')
  @ApiSort(3)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 204, description: 'Logout successful' })
  async logout(
    @Body() refreshTokenDto: AdminRefreshTokenDto,
    @Request() req: any,
  ) {
    const accessToken = req.headers?.authorization?.replace('Bearer ', '');
    await this.adminAuthService.logout(
      accessToken,
      refreshTokenDto.refreshToken,
    );
  }
}
