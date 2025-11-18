import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AdminAuthServiceClient } from '../../../common/services/external/admin-auth-service-client';
import { I18nService } from 'nestjs-i18n';

type AdminIdentity = {
  isBlocked?: boolean;
} & Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAdminPayload(value: unknown): value is { type: 'admin' } {
  if (!isPlainObject(value)) return false;
  const typeVal = value.type;
  return typeof typeVal === 'string' && typeVal === 'admin';
}

function isAdminIdentity(value: unknown): value is AdminIdentity {
  if (!isPlainObject(value)) return false;
  const blocked = value.isBlocked;
  return typeof blocked === 'boolean' || typeof blocked === 'undefined';
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private configService: ConfigService,
    private adminAuthServiceClient: AdminAuthServiceClient,
    private readonly i18n: I18nService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'default-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: unknown): Promise<AdminIdentity> {
    if (!isAdminPayload(payload)) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.invalid_token_type'),
      );
    }

    // Extract the full token from Authorization header
    const authHeader = req.headers.authorization;
    if (typeof authHeader !== 'string' || authHeader.trim().length === 0) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.missing_authorization_header'),
      );
    }

    try {
      // Validate the token with the external admin service
      const admin: unknown = await this.adminAuthServiceClient.me(authHeader);

      if (!isAdminIdentity(admin)) {
        throw new UnauthorizedException(
          this.i18n.t('common.errors.admin_not_found'),
        );
      }

      if (admin.isBlocked) {
        throw new UnauthorizedException(
          this.i18n.t('common.errors.admin_blocked'),
        );
      }

      // Return the admin data from external service
      return admin;
    } catch {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.invalid_admin_token'),
      );
    }
  }
}
