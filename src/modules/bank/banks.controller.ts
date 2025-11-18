import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BanksService } from './banks.service';
import { Bank, BankDocument } from './schemas/bank.schema';
import { PublicBankQueryDto } from './dto/update-bank.dto';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('012- Banks')
@ApiAcceptLanguage()
@Controller('banks')
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  private hasToJSON(
    doc: Bank | BankDocument | Record<string, unknown>,
  ): doc is BankDocument {
    const candidate = doc as unknown as { toJSON?: () => unknown };
    return typeof candidate.toJSON === 'function';
  }

  private mapWithLanguage(
    bank: Bank | BankDocument | Record<string, unknown>,
    lang: SupportedLanguage,
  ): Record<string, unknown> {
    type BankPlain = {
      id?: string;
      name?: { en?: string; ar?: string } | string;
      description?: { en?: string; ar?: string } | string;
      code?: string;
      depositAvailable?: boolean;
      withdrawAvailable?: boolean;
      currencies?: unknown[];
      isActive?: boolean;
      deletedAt?: Date | null;
      createdAt?: Date | string;
      updatedAt?: Date | string;
    };
    const plain: BankPlain = this.hasToJSON(bank)
      ? (bank.toJSON() as unknown as BankPlain)
      : (bank as unknown as BankPlain);

    const nameObj = plain.name as
      | { en?: string; ar?: string }
      | string
      | undefined;
    const nameText =
      typeof nameObj === 'string'
        ? nameObj
        : ((lang === SupportedLanguage.AR ? nameObj?.ar : nameObj?.en) ?? '');

    const descObj = plain.description as
      | { en?: string; ar?: string }
      | string
      | undefined;
    const descText =
      typeof descObj === 'string'
        ? descObj
        : ((lang === SupportedLanguage.AR ? descObj?.ar : descObj?.en) ?? '');

    return { ...plain, displayName: nameText, displayDescription: descText };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiSort(9)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({
    summary: 'User: List available banks with supported operations',
  })
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'depositAvailable', required: false, type: Boolean })
  @ApiQuery({ name: 'withdrawAvailable', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description:
      'Banks retrieved successfully with deposit and withdraw currencies',
  })
  async findAll(
    @Query() query: PublicBankQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.banksService.findAllPublic(query);
    const items = (
      result.items as (Bank | BankDocument | Record<string, unknown>)[]
    ).map((b) => this.mapWithLanguage(b, lang));
    return { items, pagination: result.pagination };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiSort(10)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({
    summary:
      'User: Get bank by ID with available deposit and withdraw currencies',
  })
  @ApiParam({ name: 'id', description: 'Bank ID' })
  @ApiResponse({
    status: 200,
    description: 'Bank found with deposit and withdraw currencies',
  })
  @ApiResponse({ status: 404, description: 'Bank not found' })
  async findOne(
    @Param('id') id: string,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ): Promise<Record<string, unknown>> {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const bank = await this.banksService.findOnePublic(id);
    return this.mapWithLanguage(bank, lang);
  }
}
