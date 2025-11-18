import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { type Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdatePasswordDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { extractBrowserInfoFromRequest } from '../../common/utils/browser-info';
import { ApiSort } from '../../common/decorators/api-sort.decorator';
// i18n is handled in services; controllers remain thin

// The authenticated user payload attached by JwtStrategy
type AuthUser = { id: string; email: string };

@ApiTags('004- Users')
@ApiAcceptLanguage()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiSort(3)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @Request() req: ExpressRequest,
  ) {
    const browserInfo = extractBrowserInfoFromRequest(req);
    const result = await this.usersService.create(
      createUserDto,
      req.ip,
      browserInfo,
    );
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiSort(4)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiBody({
    type: UpdateUserDto,
    description: 'fields that can be updated in the profile',
  })
  async update(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  @ApiSort(5)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Update user password' })
  @ApiResponse({ status: 204, description: 'Password updated successfully' })
  @ApiBody({
    type: UpdatePasswordDto,
    description: 'fields required to update the password',
  })
  // Skip envelope because this route returns 204 No Content
  // and should not include a response body
  @SkipEnvelope()
  async updatePassword(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    await this.usersService.updatePassword(req.user.id, updatePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiSort(6)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req: ExpressRequest & { user: AuthUser }) {
    return this.usersService.findOne(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  @ApiSort(7)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({ status: 204, description: 'Account deleted successfully' })
  // Skip envelope because this route returns 204 No Content
  // and should not include a response body
  @SkipEnvelope()
  async remove(@Request() req: ExpressRequest & { user: AuthUser }) {
    await this.usersService.remove(req.user.id);
  }
}
