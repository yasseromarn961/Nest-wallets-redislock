import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CountriesService } from './countries.service';
import { PublicCountryQueryDto } from './dto/update-country.dto';
import { Country, CountryDocument } from './schemas/country.schema';
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

@ApiTags('005- Countries')
@ApiAcceptLanguage()
@Controller('countries')
export class CountriesController {
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

  @Get()
  @ApiSort(6)
  @ApiOperation({
    summary:
      'Public: Get countries (active & not soft-deleted) with optional search',
  })
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Countries retrieved successfully' })
  async findAll(
    @Query() query: PublicCountryQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.countriesService.findAllPublic(query);
    return {
      items: (result.items as (Country | CountryDocument)[]).map((c) =>
        this.mapWithLanguage(c, lang),
      ),
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @ApiSort(7)
  @ApiOperation({
    summary: 'Public: Get country by ID (active & not soft-deleted)',
  })
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
    const country = await this.countriesService.findOnePublic(id);
    return this.mapWithLanguage(country, lang);
  }
}
