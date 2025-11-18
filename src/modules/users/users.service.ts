import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserBrowserInfo } from './schemas/user.schema';
import { Address, AddressDocument } from '../address/schemas/address.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdatePasswordDto } from './dto/update-user.dto';
import { UserType } from '../../common/enums';
import { MailService } from '../../common/services/internal/mail.service';
import { I18nService } from 'nestjs-i18n';
import { Inject } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { createPaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    private configService: ConfigService,
    private mailService: MailService,
    private readonly i18n: I18nService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    ipAddress?: string,
    browserInfo?: Partial<UserBrowserInfo>,
  ): Promise<{ user: User; message: string }> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
      deletedAt: null,
    });

    if (existingUser) {
      throw new ConflictException(
        this.i18n.t('common.errors.user_already_exists'),
      );
    }

    // Hash password
    const saltRounds = this.configService.get<number>('auth.saltRounds') || 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );

    // Generate email verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const emailVerificationExpiration =
      this.configService.get<number>('auth.emailVerificationExpiration') ||
      1800;
    const expiresAt = new Date(Date.now() + emailVerificationExpiration * 1000);

    // Create user
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      userType: createUserDto.userType || UserType.REGISTERED,
      locationInfo: ipAddress ? { ipAddress } : {},
      browserInfo: browserInfo ? { ...browserInfo } : {},
      emailVerificationCode: verificationCode,
      emailVerificationCodeExpiresAt: expiresAt,
      isEmailVerified: false,
    });

    const savedUser = await user.save();

    // Send verification email
    try {
      await this.mailService.sendEmailVerificationCode(
        savedUser.email,
        verificationCode,
      );
      this.logWinston('info', {
        event: 'verification_email_sent',
        email: savedUser.email,
      });
    } catch (error) {
      this.logWinston('error', {
        event: 'verification_email_send_failed',
        email: savedUser.email,
        error: this.normalizeError(error),
      });
      // Don't throw error, user is already created
    }

    return {
      user: savedUser,
      message: this.i18n.t('common.messages.user_registered_success'),
    };
  }

  async updateBrowserInfo(
    id: string,
    info: Partial<UserBrowserInfo>,
  ): Promise<void> {
    const update: Record<string, unknown> = {};
    if (info.userAgent !== undefined)
      update['browserInfo.userAgent'] = info.userAgent;
    if (info.browser !== undefined)
      update['browserInfo.browser'] = info.browser;
    if (info.browserVersion !== undefined)
      update['browserInfo.browserVersion'] = info.browserVersion;
    if (info.device !== undefined) update['browserInfo.device'] = info.device;
    if (info.operatingSystem !== undefined)
      update['browserInfo.operatingSystem'] = info.operatingSystem;

    if (Object.keys(update).length === 0) {
      return;
    }

    await this.userModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: update },
      { new: true },
    );
  }

  async findAll(page = 0, limit = 10, orderDirection: 'asc' | 'desc' = 'desc') {
    const sortDir = orderDirection === 'asc' ? 1 : -1;
    const users = await this.userModel
      .find({ deletedAt: null })
      .sort({ createdAt: sortDir })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.userModel.countDocuments({ deletedAt: null });

    // Populate addresses for all users
    const userIds = users.map((user) => user._id);
    const addresses = await this.addressModel
      .find({ userId: { $in: userIds }, deletedAt: null })
      .populate('countryId')
      .populate('regionId')
      .populate('cityId')
      .exec();

    // Create a map of userId to address
    const addressMap = new Map();
    addresses.forEach((address) => {
      addressMap.set(String(address.userId), address);
    });

    // Attach addresses to users
    const usersWithAddresses = users.map((user) => {
      const userObj: any = user.toObject();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const address = addressMap.get(String(user._id));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      userObj.address = address ? address.toObject() : null;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return userObj;
    });

    return createPaginatedResponse(usersWithAddresses, page, limit, total);
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ _id: id, deletedAt: null });
    if (!user) {
      throw new NotFoundException(this.i18n.t('common.errors.user_not_found'));
    }

    // Populate address with country, region, and city details
    const address = await this.addressModel
      .findOne({ userId: new Types.ObjectId(id), deletedAt: null })
      .populate('countryId')
      .populate('regionId')
      .populate('cityId')
      .exec();

    // Attach address to user object
    const userObj = user.toObject() as unknown as Record<string, unknown>;
    userObj.address = address ? address.toObject() : null;

    return userObj as unknown as UserDocument;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      email: email.toLowerCase(),
      deletedAt: null,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: updateUserDto },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException(this.i18n.t('common.errors.user_not_found'));
    }

    // Populate address with country, region, and city details
    const address = await this.addressModel
      .findOne({ userId: new Types.ObjectId(id), deletedAt: null })
      .populate('countryId')
      .populate('regionId')
      .populate('cityId')
      .exec();

    // Attach address to user object
    const userObj: any = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    userObj.address = address ? address.toObject() : null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return userObj;
  }

  async updatePassword(
    id: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    const user = await this.userModel.findOne({ _id: id, deletedAt: null });

    if (!user) {
      throw new NotFoundException(this.i18n.t('common.errors.user_not_found'));
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(
      updatePasswordDto.oldPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.invalid_old_password'),
      );
    }

    // Hash new password
    const saltRounds = this.configService.get<number>('auth.saltRounds') || 10;
    const hashedPassword = await bcrypt.hash(
      updatePasswordDto.newPassword,
      saltRounds,
    );

    user.password = hashedPassword;
    await user.save();
  }

  async remove(id: string): Promise<void> {
    const user = await this.userModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    );

    if (!user) {
      throw new NotFoundException(this.i18n.t('common.errors.user_not_found'));
    }
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async setResetPasswordCode(
    email: string,
    code: string,
    expiresAt: Date,
  ): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException(this.i18n.t('common.errors.user_not_found'));
    }

    user.resetPasswordCode = code;
    user.resetPasswordCodeExpiresAt = expiresAt;
    await user.save();
  }

  async setEmailVerificationCode(
    email: string,
    code: string,
    expiresAt: Date,
  ): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException(this.i18n.t('common.errors.user_not_found'));
    }

    user.emailVerificationCode = code;
    user.emailVerificationCodeExpiresAt = expiresAt;
    await user.save();
  }

  async verifyEmail(email: string, code: string): Promise<{ message: string }> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException(this.i18n.t('common.errors.user_not_found'));
    }

    if (user.emailVerificationCode !== code) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.invalid_verification_code'),
      );
    }

    if (
      user.emailVerificationCodeExpiresAt &&
      user.emailVerificationCodeExpiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.verification_code_expired'),
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpiresAt = undefined;
    await user.save();
    return { message: this.i18n.t('common.messages.email_verified_success') };
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException(this.i18n.t('common.errors.user_not_found'));
    }

    if (user.resetPasswordCode !== code) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.invalid_reset_code'),
      );
    }

    if (
      user.resetPasswordCodeExpiresAt &&
      user.resetPasswordCodeExpiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.reset_code_expired'),
      );
    }

    const saltRounds = this.configService.get<number>('auth.saltRounds') || 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpiresAt = undefined;
    await user.save();
    return { message: this.i18n.t('common.messages.password_reset_success') };
  }

  private normalizeError(err: unknown):
    | {
        name?: string;
        message: string;
        stack?: string;
        [key: string]: unknown;
      }
    | undefined {
    if (!err) return undefined;

    const toStringSafe = (val: unknown): string => {
      if (typeof val === 'string') return val;
      if (val instanceof Error) return val.message;
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    };

    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack,
      };
    }

    if (typeof err === 'object') {
      const src = err as Record<string, unknown>;
      const details: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) {
        details[k] = v;
      }
      return {
        message: toStringSafe(err),
        details,
      };
    }

    return { message: toStringSafe(err) };
  }

  private logWinston(
    level: 'info' | 'error',
    payload: Record<string, unknown>,
  ): void {
    const ext = this.logger as unknown as {
      info?: (message: unknown) => void;
      error?: (message: unknown) => void;
    };

    const fn = ext[level];
    if (typeof fn === 'function') {
      fn.call(this.logger, payload);
      return;
    }

    const message = (() => {
      try {
        return JSON.stringify(payload);
      } catch {
        return '[unserializable payload]';
      }
    })();

    if (level === 'info') {
      this.logger.log(message);
    } else {
      this.logger.error(message);
    }
  }
}
