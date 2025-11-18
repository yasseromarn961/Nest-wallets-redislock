import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type UserRefreshTokenDocument = UserRefreshToken & Document;

@Schema({
  collection: 'UserRefreshToken',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: Record<string, unknown>) => {
      const _id = ret['_id'];
      if (typeof _id === 'string') {
        ret['id'] = _id;
      } else if (
        typeof _id === 'object' &&
        _id !== null &&
        // Narrow common ObjectId-like values that expose toString()
        typeof (_id as { toString: () => string }).toString === 'function'
      ) {
        ret['id'] = (_id as { toString: () => string }).toString();
      }
      delete ret['_id'];
      delete ret['__v'];
      delete ret['deletedAt'];
      return ret;
    },
  },
})
export class UserRefreshToken {
  @Prop({ required: true })
  token: string;

  @Prop()
  ipAddress?: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  revokedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const UserRefreshTokenSchema =
  SchemaFactory.createForClass(UserRefreshToken);
