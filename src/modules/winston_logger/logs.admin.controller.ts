import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { LogsService } from './logs.service';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { ApiSort } from '../../common/decorators/api-sort.decorator';
import { LogsQueryDto } from './dto/logs-query.dto';
import { PaginatedLogsResponseDto, LogItemDto } from './dto/log-item.dto';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { ApiPagination } from '../../common/decorators/api-pagination.decorator';

@ApiTags('Y- Logger')
@ApiAcceptLanguage()
@SkipEnvelope()
@Controller('admin/logs')
@UseGuards(AdminJwtAuthGuard)
@ApiBearerAuth('admin-access-token')
export class LogsAdminController {
  constructor(
    private readonly logsService: LogsService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @ApiSort(1)
  @ApiOperation({
    summary: 'Admin: List logs with pagination, filters, sort, and search',
  })
  @ApiPagination({ defaultLimit: 20, maxLimit: 200, wrapped: false })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: ['timestamp', 'statusCode', 'level'],
  })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: ['info', 'warn', 'error', 'debug'],
    description: 'Log level',
  })
  @ApiQuery({
    name: 'event',
    required: false,
    enum: ['http_request', 'http_response', 'http_exception'],
    description: 'Event type',
  })
  @ApiQuery({ name: 'context', required: false, type: String })
  @ApiQuery({ name: 'requestId', required: false, type: String })
  @ApiQuery({
    name: 'method',
    required: false,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    description: 'HTTP method',
  })
  @ApiQuery({ name: 'statusCode', required: false, type: Number })
  @ApiQuery({ name: 'url', required: false, type: String })
  @ApiQuery({ name: 'service', required: false, type: String })
  @ApiQuery({ name: 'env', required: false, type: String })
  @ApiQuery({ name: 'ip', required: false, type: String })
  @ApiQuery({ name: 'lang', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'message', required: false, type: String })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'ISO date',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'ISO date',
  })
  @ApiOkResponse({
    description: 'Paginated logs result',
    type: PaginatedLogsResponseDto,
  })
  async list(@Query() query: LogsQueryDto) {
    return this.logsService.list(query);
  }

  @Get(':id')
  @ApiSort(2)
  @ApiOperation({ summary: 'Admin: Get log by id' })
  @ApiOkResponse({ description: 'Log item', type: LogItemDto })
  async getById(@Param('id') id: string) {
    const doc = await this.logsService.getById(id);
    if (!doc) {
      throw new NotFoundException(this.i18n.t('common.errors.log_not_found'));
    }
    return doc;
  }
}
