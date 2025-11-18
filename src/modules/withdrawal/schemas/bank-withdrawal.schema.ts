import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BankWithdrawalDocument = BankWithdrawal & Document;

export enum BankWithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Schema({
  collection: 'BankWithdrawal',
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
export class BankWithdrawal {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Bank', required: true })
  bankId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Currency', required: true })
  currencyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Balance', default: null })
  balanceId: Types.ObjectId | null;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  taxAmount: number;

  @Prop({ type: Number, default: 0, min: 0 })
  feeAmount: number;

  @Prop({ type: Number, required: true, min: 0 })
  reservedAmount: number;

  @Prop({ type: String, default: null })
  transferReceiptUrl: string | null;

  @Prop({ type: String, default: null })
  transactionReference: string | null;

  @Prop({
    type: String,
    enum: BankWithdrawalStatus,
    default: BankWithdrawalStatus.PENDING,
  })
  status: BankWithdrawalStatus;

  @Prop({ type: String, default: null })
  rejectionReason: string | null;

  @Prop({ type: String, default: null })
  cancellationReason: string | null;

  @Prop({ type: String, default: null })
  adminNotes: string | null;

  @Prop({ type: String, default: null })
  processedBy: string | null;

  @Prop({ type: Date, default: null })
  processedAt: Date | null;

  @Prop({ type: String, default: null })
  completedBy: string | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: Boolean, default: false })
  walletDebited: boolean;

  @Prop({ type: [Types.ObjectId], ref: 'JournalEntry', default: [] })
  journalEntryIds: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

export const BankWithdrawalSchema =
  SchemaFactory.createForClass(BankWithdrawal);

// Virtual populates to expose related documents without replacing raw IDs
BankWithdrawalSchema.virtual('bank', {
  ref: 'Bank',
  localField: 'bankId',
  foreignField: '_id',
  justOne: true,
});

BankWithdrawalSchema.virtual('currency', {
  ref: 'Currency',
  localField: 'currencyId',
  foreignField: '_id',
  justOne: true,
});

BankWithdrawalSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Indexes to improve query performance
BankWithdrawalSchema.index({ userId: 1, createdAt: -1 });
BankWithdrawalSchema.index({ status: 1, createdAt: -1 });
BankWithdrawalSchema.index({ bankId: 1, status: 1 });
BankWithdrawalSchema.index({ currencyId: 1 });
BankWithdrawalSchema.index({ processedBy: 1 });
BankWithdrawalSchema.index({ completedBy: 1 });
