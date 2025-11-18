import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CitiesService } from './cities.service';
import { PublicCityQueryDto } from './dto/update-city.dto';
import { City, CityDocument } from './schemas/city.schema';
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

@ApiTags('007- Cities')
@ApiAcceptLanguage()
@Controller('cities')
export class CitiesController {
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

  @Get()
  @ApiSort(6)
  @ApiOperation({ summary: 'Public: List cities with filters and search' })
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
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
    @Query() query: PublicCityQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.citiesService.findAllPublic(query);
    return {
      items: (result.items as (City | CityDocument)[]).map((c) =>
        this.mapWithLanguage(c, lang),
      ),
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @ApiSort(7)
  @ApiOperation({
    summary: 'Public: Get city by ID (must be active & not deleted)',
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
    const city = await this.citiesService.findOnePublic(id);
    return this.mapWithLanguage(city, lang);
  }
}
