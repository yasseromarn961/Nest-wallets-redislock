import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nContext } from 'nestjs-i18n';

@Injectable()
export class LocalizationTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      i18nLang?: string;
    }>();
    const i18n = I18nContext.current();
    const lang = i18n?.lang || request.i18nLang || 'en';

    return next.handle().pipe(
      map((data) => {
        return this.transformLocalizedFields(data, lang, new WeakSet());
      }),
    );
  }

  private transformLocalizedFields(
    data: unknown,
    lang: string,
    visited: WeakSet<object>,
  ): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    // Handle primitive types
    if (typeof data !== 'object') {
      return data;
    }

    // Handle Date objects - return as-is
    if (data instanceof Date) {
      return data;
    }

    // Prevent circular references - check BEFORE converting to JSON
    if (typeof data === 'object' && visited.has(data)) {
      return data;
    }

    // Convert Mongoose document to plain object first
    let plainData: any = data;
    if (data && typeof data === 'object' && 'toJSON' in data) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
      plainData = (data as any).toJSON();
    }

    // Add to visited after conversion
    if (typeof plainData === 'object' && plainData !== null) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      visited.add(plainData);
    }

    // Handle arrays
    if (Array.isArray(plainData)) {
      return plainData.map((item) =>
        this.transformLocalizedFields(item, lang, visited),
      );
    }

    // Handle objects
    if (typeof plainData === 'object' && plainData !== null) {
      const transformed: Record<string, unknown> = {};

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      for (const [key, value] of Object.entries(plainData)) {
        const isLocalizedObject =
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          !(value instanceof Date) &&
          'en' in (value as Record<string, unknown>) &&
          'ar' in (value as Record<string, unknown>) &&
          typeof (value as Record<string, unknown>).en === 'string' &&
          typeof (value as Record<string, unknown>).ar === 'string';

        if (isLocalizedObject) {
          const localizedValue = value as { en: string; ar: string };
          const localizedText =
            localizedValue[lang as 'en' | 'ar'] || localizedValue['en'];
          transformed[key] = localizedText;
          if (key === 'name') {
            transformed['displayName'] = localizedText;
          }
        } else if (
          value &&
          typeof value === 'object' &&
          !(value instanceof Date)
        ) {
          transformed[key] = this.transformLocalizedFields(
            value,
            lang,
            visited,
          );
        } else {
          transformed[key] = value;
        }
      }

      return transformed;
    }

    return plainData;
  }
}
