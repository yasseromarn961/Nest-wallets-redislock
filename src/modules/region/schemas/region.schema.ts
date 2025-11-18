import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RegionDocument = Region & Document;

@Schema({ _id: false })
export class LocalizedName {
  @Prop({ required: true })
  en: string;

  @Prop({ required: true })
  ar: string;
}

@Schema({
  collection: 'Region',
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
        countryId?: Types.ObjectId | string;
        [key: string]: unknown;
      },
    ) => {
      if (ret._id != null) {
        ret.id = String(ret._id);
      }
      if (ret.countryId != null) {
        ret.countryId = String(ret.countryId);
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Region {
  @Prop({ type: LocalizedName, required: true })
  name: LocalizedName;

  @Prop({ type: Types.ObjectId, ref: 'Country', required: true })
  countryId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const RegionSchema = SchemaFactory.createForClass(Region);

// Indexes to improve query performance
RegionSchema.index(
  { deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
RegionSchema.index({ 'name.en': 1 });
RegionSchema.index({ 'name.ar': 1 });
RegionSchema.index({ countryId: 1 });
