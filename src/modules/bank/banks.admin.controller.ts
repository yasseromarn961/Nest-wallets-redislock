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
import { BanksService } from './banks.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto, AdminBankQueryDto } from './dto/update-bank.dto';
import { UpdateFeeDto, FeeOperationType } from './dto/update-fee.dto';
import { Bank, BankDocument } from './schemas/bank.schema';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { ToggleDto } from './dto/toggle.dto';
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

@ApiTags('012- Banks (Admin)')
@ApiAcceptLanguage()
@Controller('banks')
export class BanksAdminController {
  constructor(private readonly banksService: BanksService) {}

  private hasToJSON(doc: Bank | BankDocument): doc is BankDocument {
    const candidate = doc as unknown as { toJSON?: () => unknown };
    return typeof candidate.toJSON === 'function';
  }

  private mapWithLanguage(
    bank: Bank | BankDocument,
    lang: SupportedLanguage,
  ): Record<string, unknown> {
    type BankPlain = {
      id?: string;
      name?: { en?: string; ar?: string };
      description?: { en?: string; ar?: string };
      code?: string;
      depositAvailable?: boolean;
      withdrawAvailable?: boolean;
      depositFee?: unknown;
      withdrawFee?: unknown;
      depositTax?: unknown;
      withdrawTax?: unknown;
      currencies?: unknown[];
      isActive?: boolean;
      deletedAt?: Date | null;
      createdAt?: Date | string;
      updatedAt?: Date | string;
    };

    const plain: BankPlain = this.hasToJSON(bank)
      ? (bank.toJSON() as unknown as BankPlain)
      : (bank as unknown as BankPlain);

    const name = plain.name ?? { en: '', ar: '' };
    const displayName =
      (lang === SupportedLanguage.AR ? name.ar : name.en) ?? '';

    const description = plain.description;
    const displayDescription = description
      ? ((lang === SupportedLanguage.AR ? description.ar : description.en) ??
        '')
      : '';

    return { ...plain, displayName, displayDescription };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('admin')
  @ApiSort(1)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Create a bank' })
  @ApiBody({ description: 'Bank payload', type: CreateBankDto })
  @ApiResponse({ status: 201, description: 'Bank created successfully' })
  @ApiResponse({ status: 409, description: 'Bank code already exists' })
  @ApiResponse({
    status: 400,
    description: 'Invalid currency or duplicate currency in array',
  })
  async create(
    @Body() dto: CreateBankDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ): Promise<Record<string, unknown>> {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const bank = await this.banksService.create(dto);
    return this.mapWithLanguage(bank, lang);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('admin/:id')
  @ApiSort(2)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Update a bank' })
  @ApiParam({ name: 'id', description: 'Bank ID' })
  @ApiBody({ description: 'Fields to update', type: UpdateBankDto })
  @ApiResponse({ status: 200, description: 'Bank updated successfully' })
  @ApiResponse({ status: 404, description: 'Bank not found' })
  @ApiResponse({ status: 409, description: 'Bank code already exists' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBankDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ): Promise<Record<string, unknown>> {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const bank = await this.banksService.update(id, dto);
    return this.mapWithLanguage(bank, lang);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('admin/:bankId/currency/:currencyId/feeOrtax')
  @ApiSort(3)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary:
      'Admin: Update fee/tax for a specific currency in a bank (depositFee, withdrawFee, depositTax, withdrawTax)',
  })
  @ApiParam({ name: 'bankId', description: 'Bank ID' })
  @ApiParam({ name: 'currencyId', description: 'Currency ID' })
  @ApiQuery({
    name: 'operationType',
    description: 'Fee operation type',
    enum: FeeOperationType,
    required: true,
  })
  @ApiBody({ type: UpdateFeeDto })
  @ApiResponse({ status: 200, description: 'Fee/tax updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Bank or currency not found' })
  async updateCurrencyFee(
    @Param('bankId') bankId: string,
    @Param('currencyId') currencyId: string,
    @Query('operationType') operationType: FeeOperationType,
    @Body() updateFeeDto: UpdateFeeDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ): Promise<Record<string, unknown>> {
    const bank = await this.banksService.updateCurrencyFee(
      bankId,
      currencyId,
      operationType,
      updateFeeDto,
    );

    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    return this.mapWithLanguage(bank, lang);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('admin/:id/activation')
  @ApiSort(4)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Toggle bank activation (enabled in body)' })
  @ApiParam({ name: 'id', description: 'Bank ID' })
  @ApiBody({ description: 'Toggle payload', type: ToggleDto })
  @ApiResponse({
    status: 200,
    description: 'Bank activation updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Bank not found or deleted' })
  async toggleActivation(@Param('id') id: string, @Body() dto: ToggleDto) {
    return this.banksService.toggleActivation(id, dto.enabled);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch('admin/:bankId/currency/:currencyId/toggle')
  @ApiSort(5)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary:
      'Admin: Toggle currency operation (deposit|withdraw) with enabled in body',
  })
  @ApiParam({ name: 'bankId', description: 'Bank ID' })
  @ApiParam({ name: 'currencyId', description: 'Currency ID' })
  @ApiQuery({
    name: 'type',
    description: 'Operation to toggle',
    enum: ['deposit', 'withdraw', 'both'],
  })
  @ApiBody({ description: 'Toggle payload', type: ToggleDto })
  @ApiResponse({
    status: 200,
    description: 'Currency operation toggled successfully',
  })
  @ApiResponse({ status: 404, description: 'Bank or currency not found' })
  async toggleCurrencyOperation(
    @Param('bankId') bankId: string,
    @Param('currencyId') currencyId: string,
    @Query('type') type: 'deposit' | 'withdraw' | 'both',
    @Body() dto: ToggleDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ): Promise<Record<string, unknown>> {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const bank: Bank | BankDocument =
      await this.banksService.toggleCurrencyOperation(
        bankId,
        currencyId,
        type,
        dto.enabled,
      );
    return this.mapWithLanguage(bank, lang);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Delete('admin/:id')
  @ApiSort(8)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Soft delete a bank' })
  @ApiParam({ name: 'id', description: 'Bank ID' })
  @ApiResponse({ status: 200, description: 'Bank soft-deleted successfully' })
  @ApiResponse({
    status: 404,
    description: 'Bank not found or already deleted',
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.banksService.softDelete(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin')
  @ApiSort(6)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: List banks with filters and search' })
  @ApiPagination({ wrapped: false })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'depositAvailable', required: false, type: Boolean })
  @ApiQuery({ name: 'withdrawAvailable', required: false, type: Boolean })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  @ApiQuery({ name: 'deletedOnly', required: false, type: Boolean })
  @ApiQuery({
    name: 'id',
    required: false,
    schema: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      example: '60f7b2f6a8b1c60012d4c8e1',
    },
    description: 'Filter by Bank ID',
  })
  @ApiQuery({ name: 'code', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Banks retrieved successfully' })
  async findAll(
    @Query() query: AdminBankQueryDto,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ) {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const result = await this.banksService.findAllAdmin(query);
    return {
      items: (result.items as (Bank | BankDocument)[]).map((b) =>
        this.mapWithLanguage(b, lang),
      ),
      pagination: result.pagination,
    };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('admin/:id')
  @ApiSort(7)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Admin: Get bank by ID (ignore isActive & deletedAt)',
  })
  @ApiParam({ name: 'id', description: 'Bank ID' })
  @ApiResponse({ status: 200, description: 'Bank found' })
  @ApiResponse({ status: 404, description: 'Bank not found' })
  async findOne(
    @Param('id') id: string,
    @I18nLang() reqLang?: string,
    @Request() req?: ExpressRequest,
  ): Promise<Record<string, unknown>> {
    const resolved =
      reqLang ?? (req ? getPreferredLanguage(req) : SupportedLanguage.EN);
    const lang = resolveSupportedLanguage(resolved);
    const bank = await this.banksService.findOneAdmin(id);
    return this.mapWithLanguage(bank, lang);
  }
}
