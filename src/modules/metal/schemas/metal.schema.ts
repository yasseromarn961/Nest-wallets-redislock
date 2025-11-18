import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MetalDocument = Metal & Document;

@Schema({ _id: false })
export class LocalizedName {
  @Prop({ required: true })
  en: string;

  @Prop({ required: true })
  ar: string;
}

@Schema({ _id: false })
export class CurrencyPrice {
  @Prop({ type: Types.ObjectId, ref: 'Currency', required: true })
  currencyId: Types.ObjectId;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ default: true })
  currencyActive: boolean;
}

@Schema({
  collection: 'Metal',
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
        currencies?: Array<{
          currencyId?: Types.ObjectId | string;
          price?: number;
          currencyActive?: boolean;
        }>;
        [key: string]: unknown;
      },
    ) => {
      if (ret._id != null) {
        ret.id = String(ret._id);
      }
      // Transform currencyId in currencies array
      if (ret.currencies && Array.isArray(ret.currencies)) {
        ret.currencies = ret.currencies.map((curr) => {
          const cid = curr.currencyId as unknown;
          // If populated (object and not an ObjectId), expose it as `currency` and normalize `currencyId` to the id string
          if (
            cid &&
            typeof cid === 'object' &&
            !(cid instanceof Types.ObjectId)
          ) {
            const currencyObj = cid as {
              id?: string;
              _id?: Types.ObjectId | string;
            } & Record<string, unknown>;
            const idStr =
              currencyObj?.id != null
                ? String(currencyObj.id)
                : currencyObj?._id != null
                  ? String(currencyObj._id)
                  : undefined;
            return {
              ...curr,
              currency: currencyObj,
              currencyId: idStr ?? curr.currencyId,
            } as Record<string, unknown>;
          }
          // Otherwise, normalize to string id only
          return {
            ...curr,
            currencyId:
              typeof curr.currencyId === 'string'
                ? curr.currencyId
                : curr.currencyId instanceof Types.ObjectId
                  ? curr.currencyId.toHexString()
                  : curr.currencyId,
          } as Record<string, unknown>;
        });
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Metal {
  @Prop({ type: LocalizedName, required: true })
  name: LocalizedName;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  purity: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [CurrencyPrice], default: [] })
  currencies: CurrencyPrice[];

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const MetalSchema = SchemaFactory.createForClass(Metal);

// Indexes to improve query performance
MetalSchema.index(
  { deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
MetalSchema.index({ 'name.en': 1 });
MetalSchema.index({ 'name.ar': 1 });
MetalSchema.index({ symbol: 1 });
MetalSchema.index({ 'currencies.currencyId': 1 });
