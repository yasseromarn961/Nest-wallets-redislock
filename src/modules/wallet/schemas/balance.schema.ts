import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BalanceDocument = Balance & Document;

export enum assetType {
  CURRENCY = 'CURRENCY',
  METAL = 'METAL',
}

@Schema({
  collection: 'Balance',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      if (ret._id != null) {
        if (ret._id instanceof Types.ObjectId) {
          ret.id = ret._id.toHexString();
        } else if (typeof ret._id === 'string') {
          ret.id = ret._id;
        }
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Balance {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  accountId: Types.ObjectId;

  @Prop({ type: String, enum: ['CURRENCY', 'METAL'], required: true })
  assetType: assetType;

  @Prop({ type: Types.ObjectId, required: true })
  assetId: Types.ObjectId;

  @Prop({ required: true })
  assetSymbol: string;

  @Prop({ type: Number, default: 0 })
  available: number;

  @Prop({ type: Number, default: 0 })
  locked: number;

  @Prop({ type: Number, default: 0 })
  reserved: number;

  createdAt: Date;
  updatedAt: Date;
}

export const BalanceSchema = SchemaFactory.createForClass(Balance);
BalanceSchema.index({ accountId: 1, assetSymbol: 1 }, { unique: true });
BalanceSchema.index({ accountId: 1, assetType: 1, assetId: 1 });
BalanceSchema.index({ assetType: 1, assetId: 1 });
