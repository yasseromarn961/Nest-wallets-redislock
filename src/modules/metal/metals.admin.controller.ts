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
import { MetalsService } from './metals.service';
import { CreateMetalDto } from './dto/create-metal.dto';
import {
  UpdateMetalDto,
  AdminMetalQueryDto,
  // AdminMetalByCurrencyQueryDto,
} from './dto/update-metal.dto';
import {
  LinkMetalCurrencyDto,
  ToggleCurrencyActivationDto,
} from './dto/metal-currency.dto';
import { Metal, MetalDocument } from './schemas/metal.schema';
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

@ApiTags('011- Metals (Admin)')
@ApiAcceptLanguage()
@Controller('metals')
export class MetalsAdminController {
  constructor(private readonly metalsService: MetalsService) {}

  private hasToJSON(doc: Metal | MetalDocument): doc is MetalDocument {
    const candidate = doc as unknown as { toJSON?: () => unknown };
    return typeof candidate.toJSON === 'function';
  }

  private mapWithLanguage(
    metal: Metal | MetalDocument,
    lang: SupportedLanguage,
  ): Record<string, unknown> {
    type MetalPlain = {
      id?: string;
      name?: { en?: string; ar?: string };
      symbol?: string;
      purity?: string;
      isActive?: boolean;
      currencies?: unknown[];
      deletedAt?: Date | null;
      createdAt?: Date | string;
      updatedAt?: Date | string;
    };

    const plain: MetalPlain = this.hasToJSON(metal)
      ? (metal.toJSON() as unknown as MetalPlain)
      : (metal as unknown as MetalPlain);

    const name = plain.name ?? { en: '', ar: '' };
    const displayName =
      (lang === SupportedLanguage.AR ? name.ar : name.en) ?? '';
    return { ...plain, displayName };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('admin')
  @ApiSort(1)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Create a metal' })
  @ApiBody({ description: 'Metal payload', type: CreateMetalDto })
  @ApiResponse({ status: 201, description: 'Metal created successfully' })
  async create(@Body() dto: CreateMetalDto) {
    return this.metalsService.create(dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('admin/:id')
  @ApiSort(2)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Update a metal' })
  @ApiParam({ name: 'id', description: 'Metal ID' })
  @ApiBody({ description: 'Fields to update', type: UpdateMetalDto })
  @ApiResponse({ status: 200, description: 'Metal updated successfully' })
  @ApiResponse({ status: 404, description: 'Metal not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateMetalDto) {
    return this.metalsService.update(id, dto);
  }

  // New: Link currency to metal with price
  @UseGuards(AdminJwtAuthGuard)
  @Post('admin/:metalId/currency')
  @ApiSort(3)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Link a currency pricing to a metal' })
  @ApiParam({ name: 'metalId', description: 'Metal ID' })
  @ApiBody({
    description: 'Currency linkage payload',
    type: LinkMetalCurrencyDto,
  })
  @ApiResponse({ status: 200, description: 'Currency linked successfully' })
  @ApiResponse({ status: 404, description: 'Metal not found or deleted' })
  @ApiResponse({
    status: 400,
    description: 'Invalid currency or duplicate currency in metal',
  })
  async linkCurrency(
    @Param('metalId') metalId: string,
    @Body() dto: LinkMetalCurrencyDto,
  ) {
    return this.metalsService.addCurrencyPricing(metalId, dto);
  }

  // Admin: Update currency pricing activation and/or price
  @UseGuards(AdminJwtAuthGuard)
  @Patch('admin/:metalId/currency/:currencyId/update')
  @ApiSort(4)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Admin: Update currency pricing activation and/or price',
  })
  @ApiParam({ name: 'metalId', description: 'Metal ID' })
  @ApiParam({ name: 'currencyId', description: 'Currency ID' })
  @ApiBody({
    description: 'Activation state',
    type: ToggleCurrencyActivationDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Currency pricing activation updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Metal or currency not found' })
  async toggleCurrencyActivation(
    @Param('metalId') metalId: string,
    @Param('currencyId') currencyId: string,
    @Body() body: ToggleCurrencyActivationDto,
  ) {
    return this.metalsService.toggleCurrencyActivation(
      metalId,
      currencyId,
      body.currencyActive,
      body.price,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Delete('admin/:id')
  @ApiSort(8)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Soft delete a metal' })
  @ApiParam({ name: 'id', description: 'Metal ID' })
  @ApiResponse({ status: 200, description: 'Metal soft-deleted successfully' })
  @ApiResponse({
    status: 404,
    description: 'Metal not found or already deleted',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.metalsService.softDelete(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin')
  @ApiSort(5)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: List metals with filters and search' })
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({
    name: 'isDeleted',
    required: false,
    type: Boolean,
    description:
      'Filter by deleted status: true returns soft-deleted records, false returns non-deleted records. If not provided, returns all records',
  })
  @ApiQuery({
    name: 'id',
    required: false,
    schema: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      example: '60f7b2f6a8b1c60012d4c8e1',
    },
    description: 'Filter by Metal ID',
  })
  @ApiQuery({ name: 'symbol', required: false, type: String })
  @ApiQuery({
    name: 'currencyId',
    required: false,
    schema: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      example: '60f7b2f6a8b1c60012d4c8e1',
    },
    description:
      'Filter by Currency ID (limits currencies array to the matched entry and populates it in response)',
  })
  @ApiResponse({ status: 200, description: 'Metals retrieved successfully' })
  async findAll(
    @Query() query: AdminMetalQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.metalsService.findAllAdmin(query);
    return {
      items: (result.items as (Metal | MetalDocument)[]).map((m) =>
        this.mapWithLanguage(m, lang),
      ),
      pagination: result.pagination,
    };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin/:id')
  @ApiSort(6)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Admin: Get metal by ID (ignore isActive & deletedAt)',
  })
  @ApiParam({ name: 'id', description: 'Metal ID' })
  @ApiResponse({ status: 200, description: 'Metal found' })
  @ApiResponse({ status: 404, description: 'Metal not found' })
  async findOne(
    @Param('id') id: string,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ): Promise<Record<string, unknown>> {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const metal = await this.metalsService.findOneAdmin(id);
    return this.mapWithLanguage(metal, lang);
  }

  // @UseGuards(AdminJwtAuthGuard)
  // @Get('admin/by-currency/:currencyId')
  // @ApiSort(7)
  // @ApiBearerAuth('admin-access-token')
  // @ApiOperation({
  //   summary:
  //     'Admin: Get metals by currency ID with optional currencyActive filter',
  // })
  // @ApiParam({ name: 'currencyId', description: 'Currency ID' })
  // @ApiPagination({ wrapped: false })
  // @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  // @ApiQuery({
  //   name: 'currencyActive',
  //   required: false,
  //   type: Boolean,
  //   description:
  //     'Filter by currency pricing activation: true returns active pricing, false returns inactive pricing, omit to return all',
  // })
  // @ApiResponse({ status: 200, description: 'Metals retrieved successfully' })
  // @ApiResponse({ status: 400, description: 'Invalid currency ID' })
  // async findByCurrencyAdmin(
  //   @Param('currencyId') currencyId: string,
  //   @Query() query: AdminMetalByCurrencyQueryDto,
  //   @I18nLang() reqLang?: string,
  //   @Request() req?: ExpressRequest,
  // ) {
  //   const resolved =
  //     reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
  //   const lang = resolveSupportedLanguage(resolved);
  //   const result = await this.metalsService.findByCurrencyAdmin(
  //     currencyId,
  //     query,
  //   );
  //   return {
  //     items: (result.items as (Metal | MetalDocument)[]).map((m) =>
  //       this.mapWithLanguage(m, lang),
  //     ),
  //     pagination: result.pagination,
  //   };
  // }
}
