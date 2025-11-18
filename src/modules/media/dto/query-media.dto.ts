import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsMongoId } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { MediaType, UploaderType } from '../schemas/media.schema';

export class QueryMediaDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by media type',
    enum: MediaType,
  })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;

  @ApiPropertyOptional({
    description: 'Filter by uploader type',
    enum: UploaderType,
  })
  @IsOptional()
  @IsEnum(UploaderType)
  uploaderType?: UploaderType;

  @ApiPropertyOptional({
    description: 'Filter by uploader ID',
  })
  @IsOptional()
  @IsMongoId()
  uploaderId?: string;
}
