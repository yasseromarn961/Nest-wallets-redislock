import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  UserType,
  SupportedLanguage,
  BrowserType,
  DeviceType,
  OperatingSystem,
  GuestTokenType,
} from '../../../common/enums';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class UserAddress {
  @Prop({ type: Types.ObjectId, required: true })
  countryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  regionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  cityId: Types.ObjectId;

  @Prop({ required: true })
  address1: string;

  @Prop()
  address2?: string;

  @Prop()
  zipCode?: string;
}

@Schema({ _id: false })
export class UserRatingStats {
  @Prop({ default: 0 })
  averageSellerRating: number;

  @Prop({ default: 0 })
  totalSellerRatings: number;

  @Prop({ default: 0 })
  averageBuyerRating: number;

  @Prop({ default: 0 })
  totalBuyerRatings: number;

  @Prop({ default: 0 })
  overallAverageRating: number;

  @Prop({ default: 0 })
  totalRatings: number;
}

@Schema({ _id: false })
export class UserBrowserInfo {
  @Prop()
  userAgent?: string;

  @Prop({ enum: BrowserType, default: BrowserType.UNKNOWN })
  browser: BrowserType;

  @Prop()
  browserVersion?: string;

  @Prop({ enum: DeviceType, default: DeviceType.UNKNOWN })
  device: DeviceType;

  @Prop({ enum: OperatingSystem, default: OperatingSystem.UNKNOWN })
  operatingSystem: OperatingSystem;
}

@Schema({ _id: false })
export class UserLocationInfo {
  @Prop()
  ipAddress?: string;

  @Prop()
  country?: string;

  @Prop()
  countryCode?: string;

  @Prop()
  region?: string;

  @Prop()
  regionName?: string;

  @Prop()
  city?: string;

  @Prop()
  timezone?: string;

  @Prop()
  isp?: string;
}

@Schema({ _id: false })
export class UserGuestToken {
  @Prop()
  token?: string;

  @Prop({ enum: GuestTokenType, default: GuestTokenType.PERSISTENT })
  tokenType: GuestTokenType;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

@Schema({
  collection: 'User',
  timestamps: true,
  toJSON: {
    virtuals: true,
    // Narrow the type of `ret` to avoid unsafe `any` access in ESLint
    transform: (
      _doc,
      ret: {
        _id?: Types.ObjectId | string;
        __v?: number;
        password?: string;
        deletedAt?: Date | null;
        resetPasswordToken?: string;
        resetPasswordTokenExpiresAt?: Date;
        resetPasswordCode?: string;
        resetPasswordCodeExpiresAt?: Date;
        emailVerificationCode?: string;
        emailVerificationCodeExpiresAt?: Date;
        id?: string;
        [key: string]: unknown;
      },
    ) => {
      // Ensure id is a string without calling methods on an `any`-typed value
      if (ret._id != null) {
        ret.id = String(ret._id);
      }
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      delete ret.deletedAt;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordTokenExpiresAt;
      delete ret.resetPasswordCode;
      delete ret.resetPasswordCodeExpiresAt;
      delete ret.emailVerificationCode;
      delete ret.emailVerificationCodeExpiresAt;
      return ret;
    },
  },
})
export class User {
  @Prop({ default: '' })
  firstName: string;

  @Prop({ default: '' })
  lastName: string;

  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  password: string;

  @Prop({ enum: UserType, default: UserType.GUEST })
  userType: UserType;

  @Prop({ type: UserAddress })
  address?: UserAddress;

  @Prop({ type: UserRatingStats, default: {} })
  ratingStats: UserRatingStats;

  @Prop({ type: UserBrowserInfo, default: {} })
  browserInfo: UserBrowserInfo;

  @Prop({ type: UserLocationInfo, default: {} })
  locationInfo: UserLocationInfo;

  @Prop({ type: UserGuestToken, default: {} })
  guestToken: UserGuestToken;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordTokenExpiresAt?: Date;

  @Prop()
  resetPasswordCode?: string;

  @Prop()
  resetPasswordCodeExpiresAt?: Date;

  @Prop()
  emailVerificationCode?: string;

  @Prop()
  emailVerificationCodeExpiresAt?: Date;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop({ default: false })
  isTwoFactorEnabled: boolean;

  @Prop()
  twoFactorCode?: string;

  @Prop()
  twoFactorCodeExpiresAt?: Date;

  @Prop({ enum: SupportedLanguage, default: SupportedLanguage.EN })
  language: SupportedLanguage;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index(
  { deletedAt: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
UserSchema.index(
  { email: 1 },
  { partialFilterExpression: { deletedAt: null } },
);
