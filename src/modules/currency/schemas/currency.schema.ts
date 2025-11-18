import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FeeType } from 'src/common/enums/index';

export type CurrencyDocument = Currency & Document;

@Schema({ _id: false })
export class LocalizedName {
  @Prop({ required: true })
  en: string;

  @Prop({ required: true })
  ar: string;
}

@Schema({ _id: false })
export class PayTabsFees {
  @Prop({ type: Boolean, default: false })
  enabled: boolean;

  @Prop({
    type: String,
    enum: Object.values(FeeType),
    default: FeeType.PERCENTAGE,
  })
  type: FeeType;

  @Prop({ type: Number, default: 0 })
  percentage: number;

  @Prop({ type: Number, default: 0 })
  fixedAmount: number;
}

@Schema({ _id: false })
export class PayTabsConfig {
  @Prop({ type: Boolean, default: false })
  paytabEnabled: boolean;

  @Prop({ type: PayTabsFees, default: {} })
  paytabFees: PayTabsFees;

  @Prop({ type: PayTabsFees, default: {} })
  paytabTax: PayTabsFees;
}

@Schema({
  collection: 'Currency',
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
export class Currency {
  @Prop({ type: LocalizedName, required: true })
  name: LocalizedName;

  @Prop({ required: true })
  symbol: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: PayTabsConfig, default: {} })
  paytab: PayTabsConfig;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const CurrencySchema = SchemaFactory.createForClass(Currency);

// Indexes to improve query performance
CurrencySchema.index(
  { deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
CurrencySchema.index({ 'name.en': 1 });
CurrencySchema.index({ 'name.ar': 1 });
CurrencySchema.index(
  { symbol: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
