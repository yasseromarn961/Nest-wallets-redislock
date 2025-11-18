import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
  ApiBody,
} from '@nestjs/swagger';
import { RegionsService } from './regions.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto, AdminRegionQueryDto } from './dto/update-region.dto';
import { Region, RegionDocument } from './schemas/region.schema';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { SupportedLanguage } from '../../common/enums';
import {
  getPreferredLanguage,
  resolveSupportedLanguage,
} from '../../common/utils/language';
import { type Request as ExpressRequest } from 'express';
import { I18nLang } from 'nestjs-i18n';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';
import { ApiSort } from '../../common/decorators/api-sort.decorator';
import { ApiPagination } from '../../common/decorators/api-pagination.decorator';

@ApiTags('006- Regions (Admin)')
@ApiAcceptLanguage()
@Controller('regions')
export class RegionsAdminController {
  constructor(private readonly regionsService: RegionsService) {}

  private hasToJSON(doc: Region | RegionDocument): doc is RegionDocument {
    const candidate = doc as unknown as { toJSON?: () => unknown };
    return typeof candidate.toJSON === 'function';
  }

  private mapWithLanguage(
    region: Region | RegionDocument,
    lang: SupportedLanguage,
  ): Record<string, unknown> {
    type RegionPlain = {
      id?: string;
      name?: { en?: string; ar?: string };
      countryId?: string;
      isActive?: boolean;
      deletedAt?: Date | null;
      createdAt?: Date | string;
      updatedAt?: Date | string;
    };

    const plain: RegionPlain = this.hasToJSON(region)
      ? (region.toJSON() as unknown as RegionPlain)
      : (region as unknown as RegionPlain);

    const name = plain.name ?? { en: '', ar: '' };
    const displayName =
      (lang === SupportedLanguage.AR ? name.ar : name.en) ?? '';
    return { ...plain, displayName };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('admin')
  @ApiSort(1)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Create a region' })
  @ApiBody({ description: 'Region payload', type: CreateRegionDto })
  @ApiResponse({ status: 201, description: 'Region created successfully' })
  async create(@Body() dto: CreateRegionDto) {
    return this.regionsService.create(dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('admin/:id')
  @ApiSort(2)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Update a region' })
  @ApiParam({ name: 'id', description: 'Region ID' })
  @ApiBody({ description: 'Fields to update', type: UpdateRegionDto })
  @ApiResponse({ status: 200, description: 'Region updated successfully' })
  @ApiResponse({ status: 404, description: 'Region not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.regionsService.update(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Delete('admin/:id')
  @ApiSort(5)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Soft delete a region' })
  @ApiParam({ name: 'id', description: 'Region ID' })
  @ApiResponse({ status: 200, description: 'Region soft-deleted successfully' })
  @ApiResponse({
    status: 404,
    description: 'Region not found or already deleted',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.regionsService.softDelete(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin')
  @ApiSort(3)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: List regions with filters and search' })
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'deletedOnly', required: false, type: Boolean })
  @ApiQuery({
    name: 'countryId',
    required: false,
    schema: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      example: '60f7b2f6a8b1c60012d4c8e1',
    },
    description: 'Mongo ObjectId for Country',
  })
  @ApiResponse({ status: 200, description: 'Regions retrieved successfully' })
  async findAll(
    @Query() query: AdminRegionQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.regionsService.findAllAdmin(query);
    return {
      items: (result.items as (Region | RegionDocument)[]).map((r) =>
        this.mapWithLanguage(r, lang),
      ),
      pagination: result.pagination,
    };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin/:id')
  @ApiSort(4)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Admin: Get region by ID (ignore isActive & deletedAt)',
  })
  @ApiParam({ name: 'id', description: 'Region ID' })
  @ApiResponse({ status: 200, description: 'Region found' })
  @ApiResponse({ status: 404, description: 'Region not found' })
  async findOne(
    @Param('id') id: string,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ): Promise<Record<string, unknown>> {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const region = await this.regionsService.findOneAdmin(id);
    return this.mapWithLanguage(region, lang);
  }
}
