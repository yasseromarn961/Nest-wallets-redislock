import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { I18nContext } from 'nestjs-i18n';
import { PayTabsService } from './paytabs.service';
import { PayTabsWebhookDto } from './dto/paytabs.dto';
import { ApiSort } from 'src/common/decorators/api-sort.decorator';
import { ApiAcceptLanguage } from 'src/common/decorators/api-accept-language.decorator';

@ApiTags('013- PayTabs')
@ApiAcceptLanguage()
@Controller('webhook/paytabs')
export class PayTabsWebhookController {
  private readonly logger = new Logger(PayTabsWebhookController.name);

  constructor(private readonly payTabsService: PayTabsService) {}

  @Post('callback')
  @ApiSort(6)
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow PayTabs to send additional fields
      transform: true,
    }),
  )
  @ApiOperation({ summary: 'PayTabs payment webhook callback' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiBody({ description: 'PayTabs webhook payload', type: PayTabsWebhookDto })
  async handleWebhook(
    @Body() webhookData: PayTabsWebhookDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Received webhook from PayTabs: ${JSON.stringify(webhookData)}`,
    );

    try {
      const result = await this.payTabsService.handleWebhook(webhookData);
      this.logger.log(
        `Webhook processed successfully: ${webhookData.tran_ref}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error}`);
      const i18n = I18nContext.current();
      return {
        success: false,
        message: i18n?.t('common.errors.internal_server_error') ?? 'Error',
      };
    }
  }
}
