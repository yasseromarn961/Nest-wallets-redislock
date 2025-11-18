import { Injectable, Inject } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { AdminLoginDto } from './dto/admin-auth.dto';
import { AdminAuthServiceClient } from '../../common/services/external/admin-auth-service-client';
import { I18nService } from 'nestjs-i18n';
import { toHttpExceptionFromExternal } from '../../common/utils/http-exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AdminAuthService {
  constructor(
    private adminAuthServiceClient: AdminAuthServiceClient,
    private readonly i18n: I18nService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async login(loginDto: AdminLoginDto, ipAddress?: string): Promise<unknown> {
    try {
      const result: unknown = await this.adminAuthServiceClient.login(
        loginDto.email,
        loginDto.password,
      );
      return result;
    } catch (error: any) {
      this.logWinston('error', 'admin_login_error', {
        email: loginDto.email,
        ipAddress,
        error: normalizeError(error),
      });
      // Pass through external service error as-is (status + message/body)
      throw toHttpExceptionFromExternal(error, this.i18n);
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<unknown> {
    try {
      const result: unknown =
        await this.adminAuthServiceClient.refresh(refreshToken);
      return result;
    } catch (error: any) {
      this.logWinston('error', 'admin_refresh_error', {
        error: normalizeError(error),
      });
      throw toHttpExceptionFromExternal(error, this.i18n);
    }
  }

  async verify2FA(
    tempToken: string,
    code: string,
    ipAddress?: string,
  ): Promise<unknown> {
    try {
      const result: unknown = await this.adminAuthServiceClient.verify2FA(
        tempToken,
        code,
      );
      return result;
    } catch (error: any) {
      this.logWinston('error', 'admin_verify2fa_error', {
        ipAddress,
        error: normalizeError(error),
      });
      throw toHttpExceptionFromExternal(error, this.i18n);
    }
  }

  async logout(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await this.adminAuthServiceClient.destroy(accessToken, refreshToken);
    } catch (error: any) {
      this.logWinston('error', 'admin_logout_error', {
        error: normalizeError(error),
      });
      // Don't throw error on logout failure
    }
  }

  async getAdminProfile(token: string): Promise<unknown> {
    try {
      const admin: unknown = await this.adminAuthServiceClient.me(token);
      return admin;
    } catch (error: any) {
      this.logWinston('error', 'admin_profile_error', {
        error: normalizeError(error),
      });
      throw toHttpExceptionFromExternal(error, this.i18n);
    }
  }

  private logWinston(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    payload?: unknown,
  ): void {
    const maybeWinston = this.logger as unknown as {
      info?: (meta: unknown) => void;
      warn?: (meta: unknown) => void;
      error?: (meta: unknown) => void;
      debug?: (meta: unknown) => void;
    };
    const fn = maybeWinston[level];
    if (typeof fn === 'function') {
      fn({ message, ...(payload as Record<string, unknown>) });
      return;
    }
    const payloadStr =
      payload == null ? '' : ` | payload=${this.toJsonSafe(payload)}`;
    const msg = `${message}${payloadStr}`;
    switch (level) {
      case 'error':
        this.logger.error(msg);
        break;
      case 'warn':
        this.logger.warn(msg);
        break;
      case 'debug':
        this.logger.debug?.(msg);
        break;
      default:
        this.logger.log?.(msg);
    }
  }

  private toJsonSafe(payload: unknown): string {
    try {
      return JSON.stringify(payload);
    } catch {
      return '"[unserializable payload]"';
    }
  }
}

function normalizeError(
  err: unknown,
):
  | { name?: string; message: string; stack?: string }
  | Record<string, unknown>
  | undefined {
  if (err == null) return undefined;
  if (typeof err === 'string') return { message: err };
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  try {
    const plain: unknown = JSON.parse(JSON.stringify(err));
    if (plain && typeof plain === 'object')
      return plain as Record<string, unknown>;
    return { detail: '[unserializable error]' };
  } catch {
    return { detail: '[unserializable error]' };
  }
}
