import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RegionsService } from './regions.service';
import { PublicRegionQueryDto } from './dto/update-region.dto';
import { Region, RegionDocument } from './schemas/region.schema';
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

@ApiTags('006- Regions')
@ApiAcceptLanguage()
@Controller('regions')
export class RegionsController {
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

  @Get()
  @ApiSort(6)
  @ApiOperation({
    summary:
      'Public: Get regions (active & not soft-deleted) with optional search and country filter',
  })
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'search', required: false, type: String })
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
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Regions retrieved successfully' })
  async findAll(
    @Query() query: PublicRegionQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.regionsService.findAllPublic(query);
    return {
      items: (result.items as (Region | RegionDocument)[]).map((r) =>
        this.mapWithLanguage(r, lang),
      ),
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @ApiSort(7)
  @ApiOperation({
    summary: 'Public: Get region by ID (active & not soft-deleted)',
  })
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
    const region = await this.regionsService.findOnePublic(id);
    return this.mapWithLanguage(region, lang);
  }
}
