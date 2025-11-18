import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type JournalEntryDocument = JournalEntry & Document;

@Schema({
  collection: 'JournalEntry',
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
export class JournalEntry {
  @Prop({ type: Types.ObjectId, ref: 'Account', required: false })
  debitAccountId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Account', required: false })
  creditAccountId?: Types.ObjectId;

  @Prop({ required: true })
  assetSymbol: string;

  @Prop({
    type: String,
    enum: ['CURRENCY', 'METAL'],
    required: true,
  })
  assetType: string;

  @Prop({ type: Types.ObjectId, required: true })
  assetId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: [String], default: [] })
  transactionIds: string[];

  @Prop({ required: true, index: { unique: true } })
  idempotencyKey: string;

  createdAt: Date;
  updatedAt: Date;
}

export const JournalEntrySchema = SchemaFactory.createForClass(JournalEntry);
JournalEntrySchema.index({
  debitAccountId: 1,
  creditAccountId: 1,
  assetType: 1,
  assetId: 1,
  assetSymbol: 1,
  createdAt: 1,
});
