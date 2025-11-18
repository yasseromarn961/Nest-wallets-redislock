import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { Reflector } from '@nestjs/core';
import { SKIP_ENVELOPE_KEY } from '../decorators/skip-envelope.decorator';

export const SUCCESS_MESSAGE_KEY = 'successMessageKey';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(
    private readonly i18n: I18nService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skipEnvelope = this.reflector.getAllAndOverride<boolean>(
      SKIP_ENVELOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipEnvelope) {
      return next.handle();
    }
    const messageKey = this.reflector.getAllAndOverride<string>(
      SUCCESS_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const lang = I18nContext?.current()?.lang;

    function isPlainObject(value: unknown): value is Record<string, unknown> {
      return (
        typeof value === 'object' && value !== null && !Array.isArray(value)
      );
    }

    return next.handle().pipe(
      map((data: unknown) => {
        // If already in envelope shape, return as-is
        if (isPlainObject(data) && 'message' in data && 'data' in data) {
          return data;
        }

        // If controller/service returned { message: string, ...rest }, use that message and wrap the rest as data
        if (isPlainObject(data) && 'message' in data) {
          const messageVal = data['message'];
          if (typeof messageVal === 'string') {
            const { message, ...rest } = data as Record<string, unknown> & {
              message: string;
            };
            const hasRest = Object.keys(rest).length > 0;
            return {
              message,
              data: hasRest ? rest : null,
            };
          }
        }

        const message = messageKey
          ? this.i18n.t(messageKey, { lang })
          : this.i18n.t('common.messages.success', { lang });

        return {
          message,
          data: data ?? null,
        };
      }),
    );
  }
}
