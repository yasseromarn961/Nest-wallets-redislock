import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * JwtLanguageResolver
 * Resolves language from the authenticated user's JWT payload when
 * no language headers are provided. It looks for `lang` or `language`
 * on `req.user`.
 */
interface JwtUserPayload {
  lang?: string;
  language?: string;
}

type AuthenticatedRequest = Request & { user?: JwtUserPayload };

export class JwtLanguageResolver /* implements I18nResolver */ {
  resolve(context: ExecutionContext): string | undefined {
    try {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const user = request?.user;
      const raw = user?.lang ?? user?.language;
      if (!raw) return undefined;
      // Normalize SupportedLanguage enum values (e.g., 'EN' | 'AR') to i18n codes ('en' | 'ar')
      const normalized = String(raw).toLowerCase();
      if (normalized === 'en' || normalized === 'ar') {
        return normalized;
      }
      // Fallback to undefined if an unsupported code is provided
      return undefined;
    } catch {
      return undefined;
    }
  }
}
