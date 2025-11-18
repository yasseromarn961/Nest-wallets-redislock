import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { PublicCurrencyQueryDto } from './dto/update-currency.dto';
import { Currency, CurrencyDocument } from './schemas/currency.schema';
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

@ApiTags('010- Currencies')
@ApiAcceptLanguage()
@Controller('currencies')
export class CurrenciesController {
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

  @Get()
  @ApiSort(6)
  @ApiOperation({ summary: 'Public: List currencies with filters and search' })
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: 'Currencies retrieved successfully',
  })
  async findAll(
    @Query() query: PublicCurrencyQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.currenciesService.findAllPublic(query);
    return {
      items: (result.items as (Currency | CurrencyDocument)[]).map((c) =>
        this.mapWithLanguage(c, lang),
      ),
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @ApiSort(7)
  @ApiOperation({
    summary: 'Public: Get currency by ID (must be active & not deleted)',
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
    const currency = await this.currenciesService.findOnePublic(id);
    return this.mapWithLanguage(currency, lang);
  }
}
