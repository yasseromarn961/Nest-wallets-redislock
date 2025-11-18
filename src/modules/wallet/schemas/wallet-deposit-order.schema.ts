import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDepositOrderDocument = WalletDepositOrder & Document;

export enum DepositType {
  PAYTAB = 'PAYTAB',
  BANK = 'BANK',
}

@Schema({
  collection: 'WalletDepositOrder',
  timestamps: true,
})
export class WalletDepositOrder {
  @Prop({ type: String, required: true, unique: true })
  orderId: string;

  @Prop({
    type: String,
    enum: Object.values(DepositType),
    required: true,
  })
  depositType: DepositType;

  @Prop({ type: Types.ObjectId, default: null })
  paymentId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  bankDepositId: Types.ObjectId | null;

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

  @Prop({ type: Types.ObjectId, required: true })
  assetId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  processed: boolean;

  // Journal entries created as part of this deposit processing
  @Prop({ type: [Types.ObjectId], ref: 'JournalEntry', default: [] })
  journalEntryIds: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

export const WalletDepositOrderSchema =
  SchemaFactory.createForClass(WalletDepositOrder);

// Indexes for efficient queries
WalletDepositOrderSchema.index({ paymentId: 1 });
WalletDepositOrderSchema.index({ bankDepositId: 1 });
WalletDepositOrderSchema.index({ userId: 1, processed: 1 });
