import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { I18nContext } from 'nestjs-i18n';
import { Reflector } from '@nestjs/core';
import { SUCCESS_MESSAGE_KEY } from './response-envelope.interceptor';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const http = context.switchToHttp();
    const rawReq = http.getRequest<unknown>();
    const rawRes = http.getResponse<unknown>();
    const req = isRequestLike(rawReq) ? rawReq : undefined;
    const res = isResponseLike(rawRes) ? rawRes : undefined;

    const method: string = typeof req?.method === 'string' ? req.method : '';
    let url = '';
    if (typeof req?.originalUrl === 'string') {
      url = req.originalUrl;
    } else if (typeof req?.url === 'string') {
      url = req.url;
    }
    const ip: string = typeof req?.ip === 'string' ? req.ip : '';
    const userAgentHeader = req?.headers?.['user-agent'];
    const userAgent: string =
      typeof userAgentHeader === 'string' ? userAgentHeader : '';
    const lang = I18nContext?.current()?.lang;
    const xRequestIdHeader = req?.headers?.['x-request-id'];
    let requestId = '';
    if (typeof xRequestIdHeader === 'string') {
      requestId = xRequestIdHeader;
    } else if (typeof req?.requestId === 'string') {
      requestId = req.requestId;
    }

    // Extract declared success message key if present, to avoid logging translated strings
    const successMessageKey = this.reflector.getAllAndOverride<string>(
      SUCCESS_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Read level toggles from configuration with type-safe defaults
    const maybeToggles = this.configService.get<unknown>('logger.levelToggles');
    const toggles = sanitizeToggles(maybeToggles);

    // Suppress noisy frontend/dev routes entirely to reduce log pollution
    const isNoise = isNoiseRoute(method, url);

    // Log incoming request only when info level is enabled and not noise
    if (toggles.infoEnabled && !isNoise) {
      this.logger.info({
        event: 'http_request',
        method,
        url,
        ip,
        userAgent,
        lang,
        requestId,
      });
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - now;
          const statusCode =
            typeof res?.statusCode === 'number' ? res.statusCode : 0;
          const level =
            statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

          const meta = {
            event: 'http_response',
            method,
            url,
            statusCode,
            durationMs,
            ip,
            userAgent,
            lang,
            requestId,
            successMessageKey,
          };

          // Avoid duplicating 5xx errors which are already logged by AllExceptionsFilter
          if (level === 'error') {
            return; // skip; global exception filter will log the error with full details
          } else if (level === 'warn') {
            if (!isNoise) this.logger.warn({ ...meta });
          } else if (toggles.infoEnabled) {
            // Only emit info-level completion when enabled
            if (!isNoise) this.logger.info({ ...meta });
          }
        },
        // /////////////////////////////
        //   error: (err: unknown) => {
        //     const durationMs = Date.now() - now;
        //     // Derive correct status code from HttpException when possible
        //     let statusCode = res?.statusCode;
        //     try {
        //       // Lazy import to avoid circular deps
        //       const maybeHttpException = err as any;
        //       if (
        //         maybeHttpException?.getStatus &&
        //         typeof maybeHttpException.getStatus === 'function'
        //       ) {
        //         statusCode = maybeHttpException.getStatus();
        //       }
        //     } catch {}
        //     const meta = {
        //       event: 'http_error',
        //       method,
        //       url,
        //       statusCode,
        //       durationMs,
        //       ip,
        //       userAgent,
        //       lang,
        //       requestId,
        //     };
        //     // If it's a server-side error (5xx), skip here to avoid duplicate logging,
        //     // the AllExceptionsFilter will produce a single, detailed error log.
        //     if ((statusCode ?? 500) >= 500) {
        //       return;
        //     }
        //     // For client-side errors (4xx), we record a warn-level entry for observability.
        //     this.logger.warn({ message: 'Request errored', ...meta, error: normalizeError(err) });
        // ///////////////////////////
        error: () => {
          // Avoid logging errors here to prevent duplication;
          // AllExceptionsFilter will produce the single, unified error log.
          return;
        },
      }),
    );
  }
}

type LevelToggles = {
  infoEnabled: boolean;
  warnEnabled: boolean;
  errorEnabled: boolean;
  debugEnabled: boolean;
};

type RequestLike = {
  method?: string;
  originalUrl?: string;
  url?: string;
  ip?: string;
  headers?: Record<string, unknown>;
  requestId?: string;
};

type ResponseLike = {
  statusCode?: number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRequestLike(value: unknown): value is RequestLike {
  if (!isPlainObject(value)) return false;
  const v = value;
  if ('headers' in v) {
    return isPlainObject(v.headers);
  }
  return true;
}

function isResponseLike(value: unknown): value is ResponseLike {
  if (!isPlainObject(value)) return false;
  const v = value;
  if ('statusCode' in v) {
    return typeof v.statusCode === 'number';
  }
  return true;
}

function sanitizeToggles(input: unknown): LevelToggles {
  const defaults: LevelToggles = {
    infoEnabled: true,
    warnEnabled: true,
    errorEnabled: true,
    debugEnabled: false,
  };
  if (!isPlainObject(input)) return defaults;
  const obj = input;
  return {
    infoEnabled:
      typeof obj.infoEnabled === 'boolean'
        ? obj.infoEnabled
        : defaults.infoEnabled,
    warnEnabled:
      typeof obj.warnEnabled === 'boolean'
        ? obj.warnEnabled
        : defaults.warnEnabled,
    errorEnabled:
      typeof obj.errorEnabled === 'boolean'
        ? obj.errorEnabled
        : defaults.errorEnabled,
    debugEnabled:
      typeof obj.debugEnabled === 'boolean'
        ? obj.debugEnabled
        : defaults.debugEnabled,
  };
}

// Noisy route matcher: suppress frontend dev/HMR and static asset routes
function isNoiseRoute(method: string, url: string): boolean {
  const isGet = (method || '').toUpperCase() === 'GET';
  const u = (url || '').toLowerCase();
  const patterns = [
    /^\/[@]vite(?:\/|$)/,
    /^\/vite(?:\/|$)/,
    /^\/sockjs-node(?:\/|$)/,
    /^\/assets\//,
    /^\/static\//,
    /^\/favicon\.ico$/,
    /^\/manifest\.json$/,
    /^\/robots\.txt$/,
  ];
  const matched = patterns.some((re) => re.test(u));
  return isGet && matched;
}
