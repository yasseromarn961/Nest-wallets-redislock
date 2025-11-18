import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FeeType } from 'src/common/enums/index';

export type BankDocument = Bank & Document;

@Schema({ _id: false })
export class LocalizedName {
  @Prop({ required: true })
  en: string;

  @Prop({ required: true })
  ar: string;
}

// FeeType imported from common enums

@Schema({ _id: false })
export class FeeStructure {
  @Prop({ default: false })
  enabled: boolean;

  @Prop({ required: false, enum: FeeType })
  type?: FeeType;

  @Prop({ type: Number, default: 0 })
  percentage?: number;

  @Prop({ type: Number, default: 0 })
  fixedAmount?: number;
}

@Schema({ _id: false })
export class CurrencyConfig {
  @Prop({ type: Types.ObjectId, ref: 'Currency', required: true })
  currencyId: Types.ObjectId;

  @Prop({ default: true })
  depositEnabled: boolean;

  @Prop({ default: true })
  withdrawEnabled: boolean;

  @Prop({ type: FeeStructure, required: true })
  depositFee: FeeStructure;

  @Prop({ type: FeeStructure, required: true })
  withdrawFee: FeeStructure;

  @Prop({ type: FeeStructure, required: true })
  depositTax: FeeStructure;

  @Prop({ type: FeeStructure, required: true })
  withdrawTax: FeeStructure;
}

@Schema({
  collection: 'Bank',
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
          depositEnabled?: boolean;
          withdrawEnabled?: boolean;
        }>;
        [key: string]: unknown;
      },
    ) => {
      if (ret._id != null) {
        ret.id = String(ret._id);
      }
      // Transform currencyId in currencies array and expose populated currency
      if (ret.currencies && Array.isArray(ret.currencies)) {
        ret.currencies = ret.currencies.map((curr) => {
          const cid = curr.currencyId as unknown;
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
export class Bank {
  @Prop({ type: LocalizedName, required: true })
  name: LocalizedName;

  @Prop({ required: true })
  code: string;

  @Prop({ type: LocalizedName })
  description?: LocalizedName;

  @Prop({ default: true })
  depositAvailable: boolean;

  @Prop({ default: true })
  withdrawAvailable: boolean;

  @Prop({ type: [CurrencyConfig], default: [] })
  currencies: CurrencyConfig[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const BankSchema = SchemaFactory.createForClass(Bank);

// Indexes to improve query performance
BankSchema.index(
  { deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
BankSchema.index({ 'name.en': 1 });
BankSchema.index({ 'name.ar': 1 });
BankSchema.index({ code: 1 });
BankSchema.index({ 'currencies.currencyId': 1 });
BankSchema.index({ isActive: 1 });
