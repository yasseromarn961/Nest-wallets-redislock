import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';
import { ApiSort } from '../../common/decorators/api-sort.decorator';
import { ApiPagination } from '../../common/decorators/api-pagination.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { UsersService } from './users.service';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';

@ApiTags('004- Users (Admin)')
@ApiAcceptLanguage()
@Controller('users')
export class UsersAdminController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin')
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Get all users (paginated)' })
  @ApiSort(1)
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Query('orderDirection') orderDirection?: 'asc' | 'desc',
  ) {
    return this.usersService.findAll(
      paginationQuery.page,
      paginationQuery.limit,
      orderDirection,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin/:id')
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Get user by ID' })
  @ApiSort(2)
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
