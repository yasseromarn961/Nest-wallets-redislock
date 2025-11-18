import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { SupportedLanguage } from '../../../common/enums';
import { I18nService } from 'nestjs-i18n';

interface JwtPayload {
  id: string;
  email: string;
  lang?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private readonly i18n: I18nService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOne(payload.id);

    if (!user) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.user_not_found'),
      );
    }

    // Ensure the account is not soft-deleted
    if (user.deletedAt !== null) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.user_deleted'),
      );
    }

    if (user.isBlocked) {
      throw new UnauthorizedException(
        this.i18n.t('common.errors.user_blocked'),
      );
    }

    // Attach language from JWT payload if present, otherwise fallback to user's stored language
    const fallbackLang: SupportedLanguage | undefined = user?.language;
    const lang: string | undefined =
      payload.lang ?? (fallbackLang ? String(fallbackLang) : undefined);
    return { id: payload.id, email: payload.email, lang };
  }
}
