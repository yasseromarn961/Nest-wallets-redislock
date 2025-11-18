import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { UserBrowserInfo } from '../users/schemas/user.schema';
import { MailService } from '../../common/services/internal/mail.service';
import {
  UserRefreshToken,
  UserRefreshTokenDocument,
} from './schemas/user-refresh-token.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { Address, AddressDocument } from '../address/schemas/address.schema';
import {
  LoginDto,
  ForgotPasswordDto,
  ResendVerificationDto,
} from './dto/auth.dto';
import { I18nService } from 'nestjs-i18n';
import { UpdatePasswordDto } from '../users/dto/update-user.dto';
import { Inject } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    @InjectModel(UserRefreshToken.name)
    private refreshTokenModel: Model<UserRefreshTokenDocument>,
    @InjectModel(Address.name)
    private addressModel: Model<AddressDocument>,
    private readonly i18n: I18nService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.usersService.validateUser(email, password);
    if (!user) {
      return null;
    }
    return user;
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    browserInfo?: Partial<UserBrowserInfo>,
  ) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.invalid_credentials'),
      );
    }

    if (user.isBlocked) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.user_blocked'),
      );
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.email_not_verified'),
      );
    }

    // Update user's browser info (from cookies/user-agent)
    if (browserInfo) {
      await this.usersService.updateBrowserInfo(String(user._id), browserInfo);
    }

    // Populate address with country, region, and city details
    const address = await this.addressModel
      .findOne({ userId: user._id, deletedAt: null })
      .populate('countryId')
      .populate('regionId')
      .populate('cityId')
      .exec();

    // Attach address to user object
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userObj: any = user.toObject();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    userObj.address = address ? address.toObject() : null;

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user, ipAddress);

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      user: userObj,
      accessToken,
      refreshToken,
    };
  }

  generateAccessToken(user: UserDocument) {
    const payload = {
      id: String(user._id),
      email: user.email,
      type: 'user',
      // Include user's preferred language in the access token payload
      // so downstream services and resolvers can use it for i18n fallback
      lang: user.language,
    };

    const expiresIn =
      this.configService.get<number>('jwt.accessTokenExpiration') || 3600;

    return {
      token: this.jwtService.sign(payload, { expiresIn }),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async generateRefreshToken(user: UserDocument, ipAddress?: string) {
    const payload = {
      id: String(user._id),
      type: 'refresh',
    };

    const expiresIn =
      this.configService.get<number>('jwt.refreshTokenExpiration') || 2592000;
    const token = this.jwtService.sign(payload, { expiresIn });

    // Save refresh token in database
    const refreshToken = new this.refreshTokenModel({
      token,
      userId: user._id,
      ipAddress,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    });

    await refreshToken.save();

    return {
      token,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload: { id: string; type: string } =
        this.jwtService.verify(refreshToken);

      // Check if refresh token exists in database
      const tokenDoc = await this.refreshTokenModel.findOne({
        token: refreshToken,
        deletedAt: null,
        revokedAt: null,
      });

      if (!tokenDoc) {
        throw new UnauthorizedException(
          this.i18n.t('common.errors.invalid_refresh_token'),
        );
      }

      // Check if token expired
      if (tokenDoc.expiresAt < new Date()) {
        throw new UnauthorizedException(
          this.i18n.t('common.errors.refresh_token_expired'),
        );
      }

      // Get user
      const user = await this.usersService.findOne(payload.id);

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      return {
        accessToken,
      };
    } catch {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.invalid_refresh_token'),
      );
    }
  }

  async revokeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.refreshTokenModel.findOneAndUpdate(
      {
        token: refreshToken,
        userId,
        deletedAt: null,
      },
      {
        $set: { revokedAt: new Date() },
      },
    );
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.revokeRefreshToken(userId, refreshToken);
  }

  async handleForgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const resetPasswordExpiration =
      this.configService.get<number>('auth.resetPasswordExpiration') || 300;
    const expiresAt = new Date(Date.now() + resetPasswordExpiration * 1000);

    await this.usersService.setResetPasswordCode(
      forgotPasswordDto.email,
      code,
      expiresAt,
    );

    // Send reset code email
    try {
      const user = await this.usersService.findByEmail(forgotPasswordDto.email);
      if (user) {
        await this.mailService.sendPasswordResetCode(user.email, code);
      }
    } catch (error) {
      this.logWinston('error', {
        event: 'reset_email_send_failed',
        email: forgotPasswordDto.email,
        error: this.normalizeError(error),
      });
    }

    return {
      message: this.i18n.t('common.messages.reset_code_sent'),
    };
  }

  async handleResendVerification(
    resendDto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(resendDto.email);
    if (!user) {
      return {
        message: this.i18n.t(
          'common.messages.verification_code_resent_generic',
        ),
      };
    }

    // Generate new verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const emailVerificationExpiration =
      this.configService.get<number>('auth.emailVerificationExpiration') ||
      1800;
    const expiresAt = new Date(Date.now() + emailVerificationExpiration * 1000);

    await this.usersService.setEmailVerificationCode(
      user.email,
      verificationCode,
      expiresAt,
    );

    // Send verification email
    try {
      await this.mailService.sendEmailVerificationCode(
        user.email,
        verificationCode,
      );
      this.logWinston('info', {
        event: 'verification_email_resent',
        email: user.email,
      });
    } catch (error) {
      this.logWinston('error', {
        event: 'verification_email_resend_failed',
        email: user.email,
        error: this.normalizeError(error),
      });
    }

    return {
      message: this.i18n.t('common.messages.verification_code_resent'),
    };
  }

  async updatePassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    await this.usersService.updatePassword(userId, updatePasswordDto);
    return { message: this.i18n.t('common.messages.password_updated_success') };
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

  // Safely call structured logging on Winston-like logger if available,
  // otherwise fall back to Nest's LoggerService methods.
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
