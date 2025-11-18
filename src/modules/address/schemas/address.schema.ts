import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AddressDocument = Address & Document;

@Schema({
  collection: 'Address',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, any>) => {
      if (ret._id != null) {
        ret.id = String(ret._id);
      }

      // Handle userId - convert to string only if it's an ObjectId
      if (ret.userId != null && typeof ret.userId !== 'object') {
        ret.userId = String(ret.userId);
      } else if (
        ret.userId != null &&
        typeof ret.userId === 'object' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ret.userId._id
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ret.userId = String(ret.userId._id);
      }

      // Handle countryId - keep populated object as 'country', convert ID to string
      if (
        ret.countryId != null &&
        typeof ret.countryId === 'object' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (ret.countryId._id || ret.countryId.id)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ret.country = ret.countryId; // Keep populated object
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ret.countryId = String(ret.countryId.id || ret.countryId._id);
      } else if (ret.countryId != null) {
        ret.countryId = String(ret.countryId);
      }

      // Handle regionId - keep populated object as 'region', convert ID to string
      if (
        ret.regionId != null &&
        typeof ret.regionId === 'object' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (ret.regionId._id || ret.regionId.id)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ret.region = ret.regionId; // Keep populated object
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ret.regionId = String(ret.regionId.id || ret.regionId._id);
      } else if (ret.regionId != null) {
        ret.regionId = String(ret.regionId);
      }

      // Handle cityId - keep populated object as 'city', convert ID to string
      if (
        ret.cityId != null &&
        typeof ret.cityId === 'object' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (ret.cityId._id || ret.cityId.id)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ret.city = ret.cityId; // Keep populated object
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ret.cityId = String(ret.cityId.id || ret.cityId._id);
      } else if (ret.cityId != null) {
        ret.cityId = String(ret.cityId);
      }

      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Address {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Country', required: true })
  countryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Region', required: true })
  regionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'City', required: true })
  cityId: Types.ObjectId;

  @Prop({ required: true })
  addressLine1: string;

  @Prop()
  addressLine2?: string;

  @Prop()
  postalCode?: string;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// Indexes to improve query performance
AddressSchema.index(
  { deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
AddressSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
AddressSchema.index({ countryId: 1 });
AddressSchema.index({ regionId: 1 });
AddressSchema.index({ cityId: 1 });
