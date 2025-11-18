import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CountryDocument = Country & Document;

@Schema({ _id: false })
export class LocalizedName {
  @Prop({ required: true })
  en: string;

  @Prop({ required: true })
  ar: string;
}

@Schema({
  collection: 'Country',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (
      _doc,
      ret: {
        _id?: Types.ObjectId | string;
        __v?: number;
        id?: string;
        deletedAt?: Date | null;
        name?: { en?: string; ar?: string };
        [key: string]: unknown;
      },
    ) => {
      if (ret._id != null) {
        ret.id = String(ret._id);
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Country {
  @Prop({ type: LocalizedName, required: true })
  name: LocalizedName;

  @Prop({ required: true, uppercase: true })
  code: string;

  @Prop({ required: true })
  dialCode: string;

  @Prop({ required: true })
  flagImageUrl: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const CountrySchema = SchemaFactory.createForClass(Country);

// Indexes to improve query performance
CountrySchema.index(
  { deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
CountrySchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
CountrySchema.index({ 'name.en': 1 });
CountrySchema.index({ 'name.ar': 1 });
CountrySchema.index({ dialCode: 1 });
