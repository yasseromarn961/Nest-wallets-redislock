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
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import {
  UpdateCurrencyDto,
  AdminCurrencyQueryDto,
} from './dto/update-currency.dto';
import { Currency, CurrencyDocument } from './schemas/currency.schema';
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

@ApiTags('010- Currencies (Admin)')
@ApiAcceptLanguage()
@Controller('currencies')
export class CurrenciesAdminController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  private hasToJSON(doc: Currency | CurrencyDocument): doc is CurrencyDocument {
    const candidate = doc as unknown as { toJSON?: () => unknown };
    return typeof candidate.toJSON === 'function';
  }

  private mapWithLanguage(
    currency: Currency | CurrencyDocument,
    lang: SupportedLanguage,
  ): Record<string, unknown> {
    type CurrencyPlain = {
      id?: string;
      name?: { en?: string; ar?: string };
      symbol?: string;
      isActive?: boolean;
      deletedAt?: Date | null;
      createdAt?: Date | string;
      updatedAt?: Date | string;
    };

    const plain: CurrencyPlain = this.hasToJSON(currency)
      ? (currency.toJSON() as unknown as CurrencyPlain)
      : (currency as unknown as CurrencyPlain);

    const name = plain.name ?? { en: '', ar: '' };
    const displayName =
      (lang === SupportedLanguage.AR ? name.ar : name.en) ?? '';
    return { ...plain, displayName };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('admin')
  @ApiSort(1)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Create a currency' })
  @ApiBody({ description: 'Currency payload', type: CreateCurrencyDto })
  @ApiResponse({ status: 201, description: 'Currency created successfully' })
  @ApiResponse({ status: 409, description: 'Currency symbol already exists' })
  async create(@Body() dto: CreateCurrencyDto) {
    return this.currenciesService.create(dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('admin/:id')
  @ApiSort(2)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Update a currency' })
  @ApiParam({ name: 'id', description: 'Currency ID' })
  @ApiBody({ description: 'Fields to update', type: UpdateCurrencyDto })
  @ApiResponse({ status: 200, description: 'Currency updated successfully' })
  @ApiResponse({ status: 404, description: 'Currency not found' })
  @ApiResponse({ status: 409, description: 'Currency symbol already exists' })
  async update(@Param('id') id: string, @Body() dto: UpdateCurrencyDto) {
    return this.currenciesService.update(id, dto);
  }

  //   @UseGuards(AdminJwtAuthGuard)
  //   @Patch('admin/:id/activate')
  //   @ApiSort(3)
  //   @ApiBearerAuth('admin-access-token')
  //   @ApiOperation({ summary: 'Admin: Activate a currency' })
  //   @ApiParam({ name: 'id', description: 'Currency ID' })
  //   @ApiResponse({ status: 200, description: 'Currency activated successfully' })
  //   @ApiResponse({ status: 404, description: 'Currency not found or deleted' })
  //   async activate(@Param('id') id: string) {
  //     return this.currenciesService.toggleActivation(id, true);
  //   }

  //   @UseGuards(AdminJwtAuthGuard)
  //   @Patch('admin/:id/deactivate')
  //   @ApiSort(4)
  //   @ApiBearerAuth('admin-access-token')
  //   @ApiOperation({ summary: 'Admin: Deactivate a currency' })
  //   @ApiParam({ name: 'id', description: 'Currency ID' })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'Currency deactivated successfully',
  //   })
  //   @ApiResponse({ status: 404, description: 'Currency not found or deleted' })
  //   async deactivate(@Param('id') id: string) {
  //     return this.currenciesService.toggleActivation(id, false);
  //   }

  @UseGuards(AdminJwtAuthGuard)
  @Delete('admin/:id')
  @ApiSort(5)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Soft delete a currency' })
  @ApiParam({ name: 'id', description: 'Currency ID' })
  @ApiResponse({
    status: 200,
    description: 'Currency soft-deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Currency not found or already deleted',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.currenciesService.softDelete(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin')
  @ApiSort(3)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: List currencies with filters and search' })
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'deletedOnly', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Currencies retrieved successfully',
  })
  async findAll(
    @Query() query: AdminCurrencyQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.currenciesService.findAllAdmin(query);
    return {
      items: (result.items as (Currency | CurrencyDocument)[]).map((c) =>
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
    summary: 'Admin: Get currency by ID (ignore isActive & deletedAt)',
  })
  @ApiParam({ name: 'id', description: 'Currency ID' })
  @ApiResponse({ status: 200, description: 'Currency found' })
  @ApiResponse({ status: 404, description: 'Currency not found' })
  async findOne(
    @Param('id') id: string,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ): Promise<Record<string, unknown>> {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const currency = await this.currenciesService.findOneAdmin(id);
    return this.mapWithLanguage(currency, lang);
  }
}
