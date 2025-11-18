import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { assetType } from './balance.schema';

export type TransactionDocument = Transaction & Document;

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
}

@Schema({ _id: false })
export class TransactionTitle {
  @Prop({ required: true })
  en: string;

  @Prop({ required: true })
  ar: string;
}

@Schema({
  collection: 'Transaction',
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
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: true })
  accountId: Types.ObjectId;

  @Prop({ type: String, enum: ['CURRENCY', 'METAL'], required: true })
  assetType: assetType;

  @Prop({ type: Types.ObjectId, required: true })
  assetId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Balance', required: true })
  balanceId: Types.ObjectId;

  @Prop({ required: true })
  assetSymbol: string;

  @Prop({ enum: TransactionType, required: true })
  type: TransactionType;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number, required: true })
  balanceBefore: number;

  @Prop({ type: Number, required: true })
  balanceAfter: number;

  @Prop({ type: TransactionTitle, required: true })
  title: TransactionTitle;

  @Prop({ type: Types.ObjectId, ref: 'JournalEntry', default: null })
  journalEntryId: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ accountId: 1, assetSymbol: 1, createdAt: -1 });
TransactionSchema.index({ journalEntryId: 1 });
TransactionSchema.index({ balanceId: 1, createdAt: -1 });
TransactionSchema.index({ assetType: 1, assetId: 1 });
