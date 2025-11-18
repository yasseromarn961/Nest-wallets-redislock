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
import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
import {
  UpdateCountryDto,
  AdminCountryQueryDto,
} from './dto/update-country.dto';
import { Country, CountryDocument } from './schemas/country.schema';
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

@ApiTags('005- Countries (Admin)')
@ApiAcceptLanguage()
@Controller('countries')
export class CountriesAdminController {
  constructor(private readonly countriesService: CountriesService) {}

  private hasToJSON(doc: Country | CountryDocument): doc is CountryDocument {
    const candidate = doc as unknown as { toJSON?: () => unknown };
    return typeof candidate.toJSON === 'function';
  }

  private mapWithLanguage(
    country: Country | CountryDocument,
    lang: SupportedLanguage,
  ): Record<string, unknown> {
    type CountryPlain = {
      id?: string;
      name?: { en?: string; ar?: string };
      code?: string;
      dialCode?: string;
      flagImageUrl?: string;
      isActive?: boolean;
      deletedAt?: Date | null;
      createdAt?: Date | string;
      updatedAt?: Date | string;
    };

    const plain: CountryPlain = this.hasToJSON(country)
      ? (country.toJSON() as unknown as CountryPlain)
      : (country as unknown as CountryPlain);

    const name = plain.name ?? { en: '', ar: '' };
    const displayName =
      (lang === SupportedLanguage.AR ? name.ar : name.en) ?? '';
    return { ...plain, displayName };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('admin')
  @ApiSort(1)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Create a country' })
  @ApiBody({ description: 'Country payload', type: CreateCountryDto })
  @ApiResponse({ status: 201, description: 'Country created successfully' })
  async create(@Body() dto: CreateCountryDto) {
    return this.countriesService.create(dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('admin/:id')
  @ApiSort(2)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Update a country' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  @ApiBody({ description: 'Fields to update', type: UpdateCountryDto })
  @ApiResponse({ status: 200, description: 'Country updated successfully' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.countriesService.update(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Delete('admin/:id')
  @ApiSort(5)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Soft delete a country' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  @ApiResponse({
    status: 200,
    description: 'Country soft-deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Country not found or already deleted',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.countriesService.softDelete(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin')
  @ApiSort(3)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: List countries with filters and search' })
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'deletedOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'code', required: false, type: String })
  @ApiQuery({ name: 'dialCode', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Countries retrieved successfully' })
  async findAll(
    @Query() query: AdminCountryQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.countriesService.findAllAdmin(query);
    return {
      items: (result.items as (Country | CountryDocument)[]).map((c) =>
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
    summary: 'Admin: Get country by ID (ignore isActive & deletedAt)',
  })
  @ApiParam({ name: 'id', description: 'Country ID' })
  @ApiResponse({ status: 200, description: 'Country found' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  async findOne(
    @Param('id') id: string,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ): Promise<Record<string, unknown>> {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const country = await this.countriesService.findOneAdmin(id);
    return this.mapWithLanguage(country, lang);
  }
}
