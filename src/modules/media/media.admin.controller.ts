import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { I18nService } from 'nestjs-i18n';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';
import { ApiPagination } from '../../common/decorators/api-pagination.decorator';
import { ApiSort } from '../../common/decorators/api-sort.decorator';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { MediaService } from './media.service';
import {
  GeneratePresignedUrlDto,
  ConfirmUploadDto,
} from './dto/upload-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { UploaderType, MediaType } from './schemas/media.schema';
import { Request as ExpressRequest } from 'express';

interface AdminJwtPayload {
  id: string;
  lang?: string;
  language?: string;
}

type AuthenticatedAdminRequest = ExpressRequest & { user: AdminJwtPayload };

@ApiTags('009- Media Management (Admin)')
@ApiAcceptLanguage()
@UseGuards(AdminJwtAuthGuard)
@ApiBearerAuth('admin-access-token')
@Controller('admin/media')
export class MediaAdminController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly i18n: I18nService,
  ) {}

  @Post('upload/direct')
  @ApiSort(1)
  @ApiOperation({
    summary: '[Admin] Upload file directly through backend',
    description:
      'Upload a file directly to S3 through the backend. The backend receives the file and uploads it to S3.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload',
        },
        type: {
          type: 'string',
          enum: Object.values(MediaType),
          description: 'Media type category',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata (JSON object)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDirect(
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: MediaType,
    @Body('metadata') metadata: string | undefined,
    @Request() req: AuthenticatedAdminRequest,
  ) {
    if (!file) {
      throw new BadRequestException(this.i18n.t('common.errors.file_required'));
    }

    if (!type || !Object.values(MediaType).includes(type)) {
      throw new BadRequestException(
        this.i18n.t('common.errors.invalid_media_type'),
      );
    }

    let parsedMetadata: Record<string, unknown> | undefined;
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata) as Record<string, unknown>;
      } catch {
        throw new BadRequestException(
          this.i18n.t('common.errors.invalid_metadata_format'),
        );
      }
    }

    return this.mediaService.uploadFile(
      file,
      req.user.id,
      UploaderType.ADMIN,
      type,
      parsedMetadata,
    );
  }

  @Post('upload/presigned-url')
  @ApiSort(2)
  @ApiOperation({
    summary: '[Admin] Generate presigned URL for direct S3 upload',
    description:
      'Generate a presigned URL that allows the client to upload directly to S3 without going through the backend.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'The type of response required: put or post (default: post)',
    enum: ['put', 'post'],
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async generatePresignedUrl(
    @Body() dto: GeneratePresignedUrlDto,
    @Query('type') type: 'put' | 'post' = 'post',
    @Request() req: AuthenticatedAdminRequest,
  ) {
    return this.mediaService.generatePresignedUrl(
      dto,
      req.user.id,
      UploaderType.ADMIN,
      type,
    );
  }

  @Post('upload/confirm')
  @ApiSort(3)
  @ApiOperation({
    summary: '[Admin] Confirm upload after using presigned URL',
    description:
      'After successfully uploading to S3 using a presigned URL, call this endpoint to save the media record in the database.',
  })
  @ApiResponse({
    status: 201,
    description: 'Upload confirmed and media record created',
  })
  @ApiResponse({ status: 400, description: 'Bad request or file not found' })
  async confirmUpload(
    @Body() dto: ConfirmUploadDto,
    @Request() req: AuthenticatedAdminRequest,
  ) {
    return this.mediaService.confirmUpload(
      dto,
      req.user.id,
      UploaderType.ADMIN,
    );
  }

  @Get()
  @ApiSort(4)
  @ApiOperation({
    summary: '[Admin] Get all media with filters',
    description:
      'Get a paginated list of all media files with optional filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Media list retrieved successfully',
  })
  @ApiPagination()
  async findAll(@Query() query: QueryMediaDto) {
    return this.mediaService.findAll(query);
  }

  @Get(':id')
  @ApiSort(5)
  @ApiOperation({ summary: '[Admin] Get media by ID' })
  @ApiResponse({ status: 200, description: 'Media found' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  @ApiParam({
    name: 'id',
    description: 'Media ID',
    example: '60f7b2f6a8b1c60012d4c8e4',
  })
  async findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Delete(':id')
  @ApiSort(6)
  @ApiOperation({
    summary: '[Admin] Soft delete media',
    description: 'Soft delete a media file.',
  })
  @ApiResponse({ status: 200, description: 'Media deleted successfully' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  @ApiParam({
    name: 'id',
    description: 'Media ID',
    example: '60f7b2f6a8b1c60012d4c8e4',
  })
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedAdminRequest,
  ) {
    await this.mediaService.delete(id, req.user.id, UploaderType.ADMIN);
    return { message: this.i18n.t('common.messages.media_deleted_success') };
  }

  @Delete(':id/permanent')
  @ApiSort(7)
  @ApiOperation({
    summary: '[Admin] Permanently delete media',
    description:
      'Permanently delete a media file from both database and S3 storage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Media permanently deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Media not found' })
  @ApiParam({
    name: 'id',
    description: 'Media ID',
    example: '60f7b2f6a8b1c60012d4c8e4',
  })
  async permanentDelete(@Param('id') id: string) {
    await this.mediaService.permanentDelete(id);
    return {
      message: this.i18n.t('common.messages.media_permanently_deleted_success'),
    };
  }
}
