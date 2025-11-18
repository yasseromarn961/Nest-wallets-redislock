import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
// AWS SDK types are not fully typed, so we disable some eslint rules
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { I18nService } from 'nestjs-i18n';
import {
  Media,
  MediaDocument,
  UploaderType,
  MediaType,
} from './schemas/media.schema';
import {
  GeneratePresignedUrlDto,
  ConfirmUploadDto,
} from './dto/upload-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';

@Injectable()
export class MediaService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(
    @InjectModel(Media.name) private mediaModel: Model<MediaDocument>,
    private configService: ConfigService,
    private i18n: I18nService,
  ) {
    const aws = this.configService.get<any>('aws');
    const s3 = this.configService.get<any>('s3');
    const accessKeyId = (aws && aws.accessKeyId) as string | undefined;
    const secretAccessKey = (aws && aws.secretAccessKey) as string | undefined;
    this.region = (s3 && s3.region) || (aws && aws.region) || 'us-east-1';
    this.bucketName = ((s3 && s3.bucketName) ||
      (aws && aws.mediaFilesS3Bucket) ||
      '') as string;

    if (!accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new InternalServerErrorException(
        this.i18n.t('common.errors.internal_server_error'),
      );
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Generate a presigned URL for direct upload to S3
   */
  async generatePresignedUrl(
    dto: GeneratePresignedUrlDto,
    uploaderId: string,
    uploaderType: UploaderType,
    mode: 'put' | 'post' = 'post',
  ): Promise<
    | { url: string; fields: Record<string, string> }
    | { url: string; key: string; expiresIn: number }
  > {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = dto.fileName.split('.').pop() || '';
    const sanitizedFileName = `${timestamp}-${randomString}.${fileExtension}`;

    // Organize files by uploader type and date
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const key = `media/${uploaderType}/${year}/${month}/${sanitizedFileName}`;

    if (mode === 'put') {
      // Presigned URL (PUT) upload
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: dto.mimeType,
        Metadata: {
          uploaderId,
          uploaderType,
          originalName: dto.fileName,
          ...(dto.metadata
            ? { customMetadata: JSON.stringify(dto.metadata) }
            : {}),
        },
      });

      try {
        const uploadUrl = await getSignedUrl(this.s3Client, command, {
          expiresIn: 3600, // 1 hour
        });
        return {
          url: uploadUrl,
          key,
          expiresIn: 3600,
        };
      } catch (err) {
        console.error('Failed to create presigned PUT URL:', err);
        throw new InternalServerErrorException(
          this.i18n.t('common.errors.internal_server_error'),
        );
      }
    }

    // Default: Presigned POST upload
    try {
      const maxUploadBytes = 100_000_000; // 100 MB default limit for safety
      const { url, fields } = await createPresignedPost(this.s3Client, {
        Bucket: this.bucketName,
        Key: key,
        Conditions: [
          ['content-length-range', 0, maxUploadBytes],
          { bucket: this.bucketName },
          { key },
          { 'Content-Type': dto.mimeType },
          { 'x-amz-meta-uploaderId': uploaderId },
          { 'x-amz-meta-uploaderType': uploaderType },
          { 'x-amz-meta-originalName': dto.fileName },
        ],
        Fields: {
          key,
          bucket: this.bucketName,
          'Content-Type': dto.mimeType,
          'x-amz-meta-uploaderId': uploaderId,
          'x-amz-meta-uploaderType': uploaderType,
          'x-amz-meta-originalName': dto.fileName,
          ...(dto.metadata
            ? { 'x-amz-meta-customMetadata': JSON.stringify(dto.metadata) }
            : {}),
        },
        Expires: 3600, // seconds
      });
      return { url, fields };
    } catch (err) {
      console.error('Failed to create presigned POST:', err);
      throw new InternalServerErrorException(
        this.i18n.t('common.errors.internal_server_error'),
      );
    }
  }

  /**
   * Confirm upload and save media record to database
   */
  async confirmUpload(
    dto: ConfirmUploadDto,
    uploaderId: string,
    uploaderType: UploaderType,
  ): Promise<Media> {
    // Verify the file exists in S3
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: dto.key,
        }),
      );
    } catch {
      throw new BadRequestException(
        this.i18n.t('common.errors.file_not_found'),
      );
    }

    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${dto.key}`;

    const media = new this.mediaModel({
      url,
      key: dto.key,
      originalName: dto.originalName,
      mimeType: dto.mimeType,
      size: dto.size,
      type: dto.type,
      uploaderId: new Types.ObjectId(uploaderId),
      uploaderType,
      metadata: dto.metadata,
    });

    return media.save();
  }

  /**
   * Upload file directly through backend
   */
  async uploadFile(
    file: Express.Multer.File,
    uploaderId: string,
    uploaderType: UploaderType,
    type: MediaType,
    metadata?: Record<string, unknown>,
  ): Promise<Media> {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.originalname.split('.').pop() || '';
    const sanitizedFileName = `${timestamp}-${randomString}.${fileExtension}`;

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const key = `media/${uploaderType}/${year}/${month}/${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        uploaderId,
        uploaderType,
        originalName: file.originalname,
        ...(metadata ? { customMetadata: JSON.stringify(metadata) } : {}),
      },
    });

    try {
      await this.s3Client.send(command);
    } catch {
      throw new InternalServerErrorException(
        this.i18n.t('common.errors.upload_failed'),
      );
    }

    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    const media = new this.mediaModel({
      url,
      key,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      type,
      uploaderId: new Types.ObjectId(uploaderId),
      uploaderType,
      metadata,
    });

    return media.save();
  }

  /**
   * Get paginated media list with filters
   */
  async findAll(query: QueryMediaDto): Promise<{
    data: Media[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const skip = page * limit;

    const filter: Record<string, unknown> = { deletedAt: null };

    if (query.type) {
      filter.type = query.type;
    }
    if (query.uploaderType) {
      filter.uploaderType = query.uploaderType;
    }
    if (query.uploaderId) {
      filter.uploaderId = new Types.ObjectId(query.uploaderId);
    }

    const [data, total] = await Promise.all([
      this.mediaModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.mediaModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Get media by ID
   */
  async findOne(id: string): Promise<Media> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(this.i18n.t('common.errors.invalid_id'));
    }

    const media = await this.mediaModel
      .findOne({ _id: id, deletedAt: null })
      .lean()
      .exec();

    if (!media) {
      throw new NotFoundException(this.i18n.t('common.errors.not_found'));
    }

    return media;
  }

  /**
   * Soft delete media
   */
  async delete(
    id: string,
    requesterId: string,
    requesterType: UploaderType,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(this.i18n.t('common.errors.invalid_id'));
    }

    const media = await this.mediaModel.findOne({ _id: id, deletedAt: null });

    if (!media) {
      throw new NotFoundException(this.i18n.t('common.errors.not_found'));
    }

    // Only allow deletion by owner or admin
    if (
      requesterType !== UploaderType.ADMIN &&
      media.uploaderId.toString() !== requesterId
    ) {
      throw new BadRequestException(this.i18n.t('common.errors.unauthorized'));
    }

    media.deletedAt = new Date();
    await media.save();
  }

  /**
   * Permanently delete media from DB and S3
   */
  async permanentDelete(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(this.i18n.t('common.errors.invalid_id'));
    }

    const media = await this.mediaModel.findById(id);

    if (!media) {
      throw new NotFoundException(this.i18n.t('common.errors.not_found'));
    }

    // Delete from S3
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: media.key,
        }),
      );
    } catch (error) {
      // Continue with DB deletion even if S3 deletion fails
      console.error('Failed to delete file from S3:', error);
    }

    // Delete from database
    await this.mediaModel.deleteOne({ _id: id });
  }
}
