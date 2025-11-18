import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankDepositDocument = BankDeposit & Document;

export enum BankDepositStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({
  collection: 'BankDeposit',
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
export class BankDeposit {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Bank', required: true })
  bankId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Currency', required: true })
  currencyId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  taxAmount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  feeAmount: number;

  @Prop({ type: String, default: null })
  transferImageUrl: string | null;

  @Prop({ type: String, default: null })
  transactionReference: string | null;

  @Prop({
    type: String,
    enum: BankDepositStatus,
    default: BankDepositStatus.PENDING,
  })
  status: BankDepositStatus;

  @Prop({ type: String, default: null })
  rejectionReason: string | null;

  @Prop({ type: String, default: null })
  processedBy: string | null;

  @Prop({ type: Date, default: null })
  processedAt: Date | null;

  @Prop({ type: Boolean, default: false })
  walletCredited: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'JournalEntry', default: [] })
  journalEntryIds: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

export const BankDepositSchema = SchemaFactory.createForClass(BankDeposit);

// Virtual populates to expose related documents without replacing raw IDs
BankDepositSchema.virtual('bank', {
  ref: 'Bank',
  localField: 'bankId',
  foreignField: '_id',
  justOne: true,
});

BankDepositSchema.virtual('currency', {
  ref: 'Currency',
  localField: 'currencyId',
  foreignField: '_id',
  justOne: true,
});

// Indexes to improve query performance
BankDepositSchema.index({ userId: 1, createdAt: -1 });
BankDepositSchema.index({ status: 1, createdAt: -1 });
BankDepositSchema.index({ bankId: 1, status: 1 });
BankDepositSchema.index({ currencyId: 1 });
BankDepositSchema.index({ processedBy: 1 });
