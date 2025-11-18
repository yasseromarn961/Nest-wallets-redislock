import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentType {
  WALLET_DEPOSIT = 'WALLET_DEPOSIT',
  PRODUCT_ORDER = 'PRODUCT_ORDER',
  SUBSCRIPTION_ORDER = 'SUBSCRIPTION_ORDER',
}

@Schema({
  collection: 'Payment',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (
      _doc,
      ret: {
        _id?: Types.ObjectId | string;
        __v?: number;
        id?: string;
        [key: string]: unknown;
      },
    ) => {
      if (ret._id != null) {
        ret.id = String(ret._id);
      }
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Payment {
  @Prop({ type: String, required: true, index: true })
  orderId: string;

  @Prop({ type: String, enum: Object.values(PaymentType), required: true })
  orderType: PaymentType;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  currencyId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    required: true,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Prop({ type: String })
  paymentLink?: string;

  @Prop({ type: String, index: true })
  transactionId?: string;

  @Prop({ type: String })
  code?: string;

  @Prop({ type: String })
  responseMessage?: string;

  @Prop({ type: String })
  responseStatus?: string;

  @Prop({ type: String })
  paymentMethodType?: string;

  @Prop({ type: String })
  paymentMethod?: string;

  @Prop({ type: String })
  cardType?: string;

  @Prop({ type: String })
  cardScheme?: string;

  @Prop({ type: String })
  cardFirst6?: string;

  @Prop({ type: String })
  cardLast4?: string;

  @Prop({ type: Number })
  expiryMonth?: number;

  @Prop({ type: Number })
  expiryYear?: number;

  @Prop({ type: String })
  paymentDescription?: string;

  @Prop({ type: String })
  trace?: string;

  @Prop({ type: Number })
  serviceId?: number;

  @Prop({ type: Number })
  merchantId?: number;

  @Prop({ type: Number })
  profileId?: number;

  @Prop({ type: String })
  paymentChannel?: string;

  @Prop({ type: Date })
  transactionTime?: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Create compound indexes for efficient queries
PaymentSchema.index({ orderId: 1, orderType: 1 }, { unique: true });
PaymentSchema.index({ userId: 1, paymentStatus: 1 });
PaymentSchema.index(
  { deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
