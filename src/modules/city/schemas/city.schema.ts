import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CityDocument = City & Document;

@Schema({ _id: false })
export class LocalizedName {
  @Prop({ required: true })
  en: string;

  @Prop({ required: true })
  ar: string;
}

@Schema({
  collection: 'City',
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
        regionId?: Types.ObjectId | string;
        [key: string]: unknown;
      },
    ) => {
      if (ret._id != null) {
        ret.id = String(ret._id);
      }
      if (ret.countryId != null) {
        ret.countryId = String(ret.countryId);
      }
      if (ret.regionId != null) {
        ret.regionId = String(ret.regionId);
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class City {
  @Prop({ type: LocalizedName, required: true })
  name: LocalizedName;

  @Prop({ type: Types.ObjectId, ref: 'Country', required: true })
  countryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Region', required: true })
  regionId: Types.ObjectId;

  @Prop({ required: false })
  postalCode?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const CitySchema = SchemaFactory.createForClass(City);

// Indexes to improve query performance
CitySchema.index(
  { deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
CitySchema.index({ 'name.en': 1 });
CitySchema.index({ 'name.ar': 1 });
CitySchema.index({ countryId: 1 });
CitySchema.index({ regionId: 1 });
CitySchema.index({ countryId: 1, regionId: 1 });
