import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiAcceptLanguage } from './common/decorators/api-accept-language.decorator';
import { AppService } from './app.service';
import { I18nLang, I18nService } from 'nestjs-i18n';

@ApiTags('Z- Health')
@ApiAcceptLanguage()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Server is running' })
  getHello(@I18nLang() reqLang?: string): string {
    // Localize the generic greeting message
    return this.i18n.t('common.messages.greeting', { lang: reqLang });
  }

  @Get('health')
  @ApiOperation({ summary: 'API health status' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
