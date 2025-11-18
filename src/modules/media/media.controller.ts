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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';
import {
  GeneratePresignedUrlDto,
  ConfirmUploadDto,
} from './dto/upload-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { UploaderType, MediaType } from './schemas/media.schema';
import { Request as ExpressRequest } from 'express';

interface JwtUserPayload {
  id: string;
  lang?: string;
  language?: string;
}

type AuthenticatedRequestWithUser = ExpressRequest & { user: JwtUserPayload };

@ApiTags('009- Media Management')
@ApiAcceptLanguage()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('user-access-token')
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly i18n: I18nService,
  ) {}

  @Post('upload/direct')
  @ApiSort(8)
  @ApiOperation({
    summary: '[User] Upload file directly through backend',
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
    @Request() req: AuthenticatedRequestWithUser,
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
      UploaderType.USER,
      type,
      parsedMetadata,
    );
  }

  @Post('upload/presigned-url')
  @ApiSort(9)
  @ApiOperation({
    summary: '[User] Generate presigned URL for direct S3 upload',
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
    @Request() req: AuthenticatedRequestWithUser,
  ) {
    return this.mediaService.generatePresignedUrl(
      dto,
      req.user.id,
      UploaderType.USER,
      type,
    );
  }

  @Post('upload/confirm')
  @ApiSort(10)
  @ApiOperation({
    summary: '[User] Confirm upload after using presigned URL',
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
    @Request() req: AuthenticatedRequestWithUser,
  ) {
    return this.mediaService.confirmUpload(dto, req.user.id, UploaderType.USER);
  }

  @Get()
  @ApiSort(11)
  @ApiOperation({
    summary: '[User] Get media list',
    description: 'Get a paginated list of media files uploaded by the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Media list retrieved successfully',
  })
  @ApiPagination()
  async findAll(
    @Query() query: QueryMediaDto,
    @Request() req: AuthenticatedRequestWithUser,
  ) {
    // Users can only see their own media
    const userQuery = { ...query, uploaderId: req.user.id };
    return this.mediaService.findAll(userQuery);
  }

  @Get(':id')
  @ApiSort(12)
  @ApiOperation({ summary: '[User] Get media by ID' })
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
  @ApiSort(13)
  @ApiOperation({
    summary: '[User] Delete media',
    description:
      'Soft delete a media file. Users can only delete their own files.',
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
    @Request() req: AuthenticatedRequestWithUser,
  ) {
    await this.mediaService.delete(id, req.user.id, UploaderType.USER);
    return { message: this.i18n.t('common.messages.media_deleted_success') };
  }
}
