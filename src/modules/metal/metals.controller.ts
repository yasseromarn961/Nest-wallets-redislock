import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MetalsService } from './metals.service';
import {
  PublicMetalQueryDto,
  // PublicMetalByCurrencyQueryDto,
} from './dto/update-metal.dto';
import { Metal, MetalDocument } from './schemas/metal.schema';
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

@ApiTags('011- Metals')
@ApiAcceptLanguage()
@Controller('metals')
export class MetalsController {
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

  // @Get('by-currency/:currencyId')
  // @ApiSort(9)
  // @ApiOperation({
  //   summary: 'Public: Get metals by currency ID with currencyActive=true only',
  // })
  // @ApiParam({ name: 'currencyId', description: 'Currency ID' })
  // @ApiPagination({ wrapped: false })
  // @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  // @ApiResponse({ status: 200, description: 'Metals retrieved successfully' })
  // @ApiResponse({ status: 404, description: 'Currency not found or inactive' })
  // async findByCurrency(
  //   @Param('currencyId') currencyId: string,
  //   @Query() query: PublicMetalByCurrencyQueryDto,
  //   @I18nLang() reqLang?: string,
  //   @Request() req?: ExpressRequest,
  // ) {
  //   const resolved =
  //     reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
  //   const lang = resolveSupportedLanguage(resolved);
  //   const result = await this.metalsService.findByCurrency(currencyId, query);
  //   return {
  //     items: (result.items as (Metal | MetalDocument)[]).map((m) =>
  //       this.mapWithLanguage(m, lang),
  //     ),
  //     pagination: result.pagination,
  //   };
  // }

  @Get()
  @ApiSort(8)
  @ApiOperation({ summary: 'Public: List metals with filters and search' })
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
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
    @Query() query: PublicMetalQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.metalsService.findAllPublic(query);
    return {
      items: (result.items as (Metal | MetalDocument)[]).map((m) =>
        this.mapWithLanguage(m, lang),
      ),
      pagination: result.pagination,
    };
  }

  @Get(':id')
  @ApiSort(10)
  @ApiOperation({
    summary: 'Public: Get metal by ID (must be active & not deleted)',
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
    const metal = await this.metalsService.findOnePublic(id);
    return this.mapWithLanguage(metal, lang);
  }
}
