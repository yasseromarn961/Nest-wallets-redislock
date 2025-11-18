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
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiSort } from '../../common/decorators/api-sort.decorator';

type AuthUser = { id: string; email: string };

@ApiTags('008- User Addresses')
@ApiAcceptLanguage()
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiSort(3)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Create user address (one address per user)' })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  @ApiResponse({ status: 409, description: 'Address already exists' })
  @ApiBody({
    type: CreateAddressDto,
    description: 'Address information',
  })
  async create(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() createAddressDto: CreateAddressDto,
  ) {
    return this.addressService.create(req.user.id, createAddressDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  @ApiSort(4)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Update user address' })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @ApiBody({
    type: UpdateAddressDto,
    description: 'Fields to update in the address',
  })
  async update(
    @Request() req: ExpressRequest & { user: AuthUser },
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressService.update(req.user.id, updateAddressDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiSort(5)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Get current user address' })
  @ApiResponse({ status: 200, description: 'Address retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async findOne(@Request() req: ExpressRequest & { user: AuthUser }) {
    return this.addressService.findOne(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  @ApiSort(6)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Delete current user address' })
  @ApiResponse({ status: 204, description: 'Address deleted successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @SkipEnvelope()
  async remove(@Request() req: ExpressRequest & { user: AuthUser }) {
    await this.addressService.softDelete(req.user.id);
  }
}
