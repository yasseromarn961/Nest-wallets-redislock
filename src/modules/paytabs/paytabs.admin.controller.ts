import {
  Controller,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Currency,
  CurrencyDocument,
} from '../currency/schemas/currency.schema';
import { UpdateCurrencyPayTabsDto } from './dto/paytabs.dto';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { I18nContext } from 'nestjs-i18n';
import { ApiSort } from 'src/common/decorators/api-sort.decorator';
import { ApiAcceptLanguage } from 'src/common/decorators/api-accept-language.decorator';
@ApiTags('013- PayTabs (Admin)')
@ApiAcceptLanguage()
@Controller('admin/paytabs')
@UseGuards(AdminJwtAuthGuard)
@ApiBearerAuth('admin-access-token')
export class AdminPayTabsController {
  constructor(
    @InjectModel(Currency.name) private currencyModel: Model<CurrencyDocument>,
  ) {}

  @Patch('currency/:currencyId')
  @ApiSort(1)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update PayTabs configuration for a currency' })
  @ApiResponse({
    status: 200,
    description: 'PayTabs configuration updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Currency not found' })
  async updateCurrencyPayTabsConfig(
    @Param('currencyId') currencyId: string,
    @Body() updateDto: UpdateCurrencyPayTabsDto,
  ) {
    const currency = await this.currencyModel.findByIdAndUpdate(
      currencyId,
      {
        $set: {
          'paytab.paytabEnabled': updateDto.paytabEnabled,
          ...(updateDto.paytabFees && {
            'paytab.paytabFees': updateDto.paytabFees,
          }),
          ...(updateDto.paytabTax && {
            'paytab.paytabTax': updateDto.paytabTax,
          }),
        },
      },
      { new: true },
    );

    if (!currency) {
      const i18n = I18nContext.current();
      throw new NotFoundException(i18n?.t('common.errors.currency_not_found'));
    }

    const i18n = I18nContext.current();
    return {
      message: i18n?.t('common.messages.paytabs_updated'),
      currency,
    };
  }
}
