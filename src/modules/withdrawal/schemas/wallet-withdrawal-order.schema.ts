import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum WithdrawalMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export type WalletWithdrawalOrderDocument = WalletWithdrawalOrder & Document;

@Schema({
  collection: 'WalletWithdrawalOrder',
  timestamps: true,
})
export class WalletWithdrawalOrder {
  @Prop({ type: String, required: true, unique: true })
  orderId: string;

  @Prop({
    type: String,
    enum: WithdrawalMethod,
    required: true,
  })
  withdrawalMethod: WithdrawalMethod;

  @Prop({ type: Types.ObjectId, required: true })
  bankWithdrawalId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  walletAccountId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  baseAmount: number;

  @Prop({ type: Number, default: 0 })
  feesAmount: number;

  @Prop({ type: Number, default: 0 })
  taxAmount: number;

  @Prop({ type: String, required: true })
  assetSymbol: string;

  @Prop({ type: Boolean, default: false })
  processed: boolean;

  // Journal entries created as part of this withdrawal processing
  @Prop({ type: [Types.ObjectId], ref: 'JournalEntry', default: [] })
  journalEntryIds: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

export const WalletWithdrawalOrderSchema = SchemaFactory.createForClass(
  WalletWithdrawalOrder,
);

// Indexes for efficient queries
WalletWithdrawalOrderSchema.index({ bankWithdrawalId: 1 });
WalletWithdrawalOrderSchema.index({ userId: 1, processed: 1 });
WalletWithdrawalOrderSchema.index({ orderId: 1 }, { unique: true });
