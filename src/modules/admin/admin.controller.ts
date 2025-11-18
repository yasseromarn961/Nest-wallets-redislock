import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';
import { AdminService } from './admin.service';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { ApiSort } from '../../common/decorators/api-sort.decorator';

@ApiTags('001- Admin')
@ApiAcceptLanguage()
@Controller('admin/admins')
@UseGuards(AdminJwtAuthGuard)
@ApiBearerAuth('admin-access-token')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiSort(1)
  @ApiOperation({ summary: 'Get all admins (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'orderColumn', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Admins retrieved successfully' })
  async list(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
    @Query('orderColumn') orderColumn?: string,
    @Query('orderDirection') orderDirection?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const token = req.headers?.authorization;
    const query: Record<string, any> = {};

    if (page) query.page = page;
    if (pageSize) query.pageSize = pageSize;
    if (search) query.search = search;
    if (orderColumn) query.orderColumn = orderColumn;
    if (orderDirection) query.orderDirection = orderDirection;
    if (dateFrom) query.dateFrom = dateFrom;
    if (dateTo) query.dateTo = dateTo;

    return this.adminService.listAdmins(token, query);
  }

  @Get(':id')
  @ApiSort(2)
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiParam({ name: 'id', description: 'Admin ID' })
  @ApiResponse({ status: 200, description: 'Admin found' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async show(@Request() req: any, @Param('id') id: string) {
    const token = req.headers?.authorization;
    return this.adminService.getAdminById(token, id);
  }
}
