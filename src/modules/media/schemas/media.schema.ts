import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MediaDocument = Media & Document;

export enum UploaderType {
  USER = 'user',
  ADMIN = 'admin',
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  OTHER = 'other',
}

@Schema({
  collection: 'Media',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (
      _doc,
      ret: {
        _id?: Types.ObjectId | string;
        __v?: number;
        id?: string;
        uploaderId?: Types.ObjectId | string;
        [key: string]: unknown;
      },
    ) => {
      if (ret._id != null) {
        ret.id = String(ret._id);
      }
      if (ret.uploaderId != null) {
        ret.uploaderId = String(ret.uploaderId);
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Media {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: String, enum: MediaType, required: true })
  type: MediaType;

  @Prop({ type: Types.ObjectId, required: true })
  uploaderId: Types.ObjectId;

  @Prop({ type: String, enum: UploaderType, required: true })
  uploaderType: UploaderType;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const MediaSchema = SchemaFactory.createForClass(Media);

// Indexes to improve query performance
MediaSchema.index(
  { deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
MediaSchema.index({ uploaderId: 1, uploaderType: 1 });
MediaSchema.index({ type: 1 });
MediaSchema.index({ key: 1 }, { unique: true });
MediaSchema.index({ createdAt: -1 });
