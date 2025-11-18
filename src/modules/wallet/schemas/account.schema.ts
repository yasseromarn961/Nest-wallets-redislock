import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AccountDocument = Account & Document;

export enum AccountType {
  WALLET = 'WALLET',
  SYSTEM = 'SYSTEM',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Schema({
  collection: 'Account',
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
export class Account {
  @Prop({ enum: AccountType, required: true })
  type: AccountType;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId: Types.ObjectId | null;

  @Prop({ required: true })
  subtype: string;

  @Prop({ default: AccountStatus.ACTIVE, enum: AccountStatus })
  status: AccountStatus;

  @Prop({ type: String, default: null })
  name: string | null;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
AccountSchema.index(
  { type: 1, userId: 1, subtype: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
