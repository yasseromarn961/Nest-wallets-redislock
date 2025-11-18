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
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto, AdminCityQueryDto } from './dto/update-city.dto';
import { City, CityDocument } from './schemas/city.schema';
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

@ApiTags('007- Cities (Admin)')
@ApiAcceptLanguage()
@Controller('cities')
export class CitiesAdminController {
  constructor(private readonly citiesService: CitiesService) {}

  private hasToJSON(doc: City | CityDocument): doc is CityDocument {
    const candidate = doc as unknown as { toJSON?: () => unknown };
    return typeof candidate.toJSON === 'function';
  }

  private mapWithLanguage(
    city: City | CityDocument,
    lang: SupportedLanguage,
  ): Record<string, unknown> {
    type CityPlain = {
      id?: string;
      name?: { en?: string; ar?: string };
      countryId?: string;
      regionId?: string;
      isActive?: boolean;
      deletedAt?: Date | null;
      createdAt?: Date | string;
      updatedAt?: Date | string;
    };

    const plain: CityPlain = this.hasToJSON(city)
      ? (city.toJSON() as unknown as CityPlain)
      : (city as unknown as CityPlain);

    const name = plain.name ?? { en: '', ar: '' };
    const displayName =
      (lang === SupportedLanguage.AR ? name.ar : name.en) ?? '';
    return { ...plain, displayName };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('admin')
  @ApiSort(1)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Create a city' })
  @ApiBody({ description: 'City payload', type: CreateCityDto })
  @ApiResponse({ status: 201, description: 'City created successfully' })
  async create(@Body() dto: CreateCityDto) {
    return this.citiesService.create(dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('admin/:id')
  @ApiSort(2)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Update a city' })
  @ApiParam({ name: 'id', description: 'City ID' })
  @ApiBody({ description: 'Fields to update', type: UpdateCityDto })
  @ApiResponse({ status: 200, description: 'City updated successfully' })
  @ApiResponse({ status: 404, description: 'City not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.citiesService.update(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Delete('admin/:id')
  @ApiSort(5)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Soft delete a city' })
  @ApiParam({ name: 'id', description: 'City ID' })
  @ApiResponse({ status: 200, description: 'City soft-deleted successfully' })
  @ApiResponse({
    status: 404,
    description: 'City not found or already deleted',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.citiesService.softDelete(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin')
  @ApiSort(3)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: List cities with filters and search' })
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
  @ApiQuery({
    name: 'regionId',
    required: false,
    schema: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      example: '60f7b2f6a8b1c60012d4c8e2',
    },
    description: 'Mongo ObjectId for Region',
  })
  @ApiResponse({ status: 200, description: 'Cities retrieved successfully' })
  async findAll(
    @Query() query: AdminCityQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.citiesService.findAllAdmin(query);
    return {
      items: (result.items as (City | CityDocument)[]).map((c) =>
        this.mapWithLanguage(c, lang),
      ),
      pagination: result.pagination,
    };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin/:id')
  @ApiSort(4)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Admin: Get city by ID (ignore isActive & deletedAt)',
  })
  @ApiParam({ name: 'id', description: 'City ID' })
  @ApiResponse({ status: 200, description: 'City found' })
  @ApiResponse({ status: 404, description: 'City not found' })
  async findOne(
    @Param('id') id: string,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ): Promise<Record<string, unknown>> {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const city = await this.citiesService.findOneAdmin(id);
    return this.mapWithLanguage(city, lang);
  }
}
