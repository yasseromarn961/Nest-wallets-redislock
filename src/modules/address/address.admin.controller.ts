import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';
import { ApiPagination } from '../../common/decorators/api-pagination.decorator';
import { AddressService } from './address.service';
import { AdminAddressQueryDto } from './dto/update-address.dto';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { ApiSort } from '../../common/decorators/api-sort.decorator';

@ApiTags('008- User Addresses (Admin)')
@ApiAcceptLanguage()
@UseGuards(AdminJwtAuthGuard)
@ApiBearerAuth('admin-access-token')
@Controller('admin/addresses')
export class AddressAdminController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @ApiSort(1)
  @ApiOperation({ summary: '[Admin] Get all addresses with filters' })
  @ApiResponse({ status: 200, description: 'Addresses retrieved successfully' })
  @ApiPagination()
  async findAll(@Query() query: AdminAddressQueryDto) {
    return this.addressService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiSort(2)
  @ApiOperation({ summary: '[Admin] Get address by ID' })
  @ApiResponse({ status: 200, description: 'Address found' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @ApiParam({
    name: 'id',
    description: 'Address ID',
    example: '60f7b2f6a8b1c60012d4c8e4',
  })
  async findOne(@Param('id') id: string) {
    return this.addressService.findOneAdmin(id);
  }
}
