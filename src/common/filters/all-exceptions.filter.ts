import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import type { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { I18nContext } from 'nestjs-i18n';

interface ExceptionLogPayload {
  message: string;
  event: 'http_exception';
  method: string;
  url: string;
  statusCode: number;
  ip: string;
  userAgent: string | string[] | undefined;
  requestId?: string | string[] | undefined;
  lang?: string;
  routePath?: string;
  error?: Record<string, unknown>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    private readonly i18n: I18nService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const method: string = request.method;
    const url: string = request.originalUrl || request.url;
    const ip: string = request.ip ?? '';
    const userAgentHeader: string | string[] | undefined =
      request.headers['user-agent'];
    const userAgent: string = (() => {
      const h = userAgentHeader as unknown;
      if (Array.isArray(h)) {
        const arr = h as ReadonlyArray<unknown>;
        const first = arr[0];
        return typeof first === 'string' ? first : '';
      }
      return typeof h === 'string' ? h : '';
    })();
    const routePath = (() => {
      const r = (request as unknown as { route?: { path?: unknown } }).route;
      const p = r?.path;
      return typeof p === 'string' ? p : undefined;
    })();
    const lang = (() => {
      try {
        const i18nCtx = I18nContext.current?.();
        const maybeLang = (i18nCtx as { lang?: unknown })?.lang;
        return typeof maybeLang === 'string' ? maybeLang : undefined;
      } catch {
        return undefined;
      }
    })();
    const requestIdHeader: string | string[] | undefined =
      request.headers['x-request-id'] ?? request.headers['x-correlation-id'];
    const requestId: string | undefined =
      (Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader) ||
      request.requestId;

    // Suppress logging for known noisy frontend/dev routes (e.g., Vite HMR, assets)
    const isNoise = isNoiseRoute(method, url, status);

    const unhandledMessage = toLocalizedString(
      this.i18n,
      'common.errors.unhandled_exception',
      lang,
      'Unhandled exception',
    );

    const payload: ExceptionLogPayload = {
      message: unhandledMessage,
      event: 'http_exception',
      method,
      url,
      statusCode: status,
      ip,
      userAgent,
      requestId,
      lang,
      routePath,
    };

    if (exception instanceof HttpException) {
      // Log the raw message without translating again
      const normalized = normalizeHttpException(
        exception.getResponse() as unknown,
        lang,
        this.i18n,
      );
      const details: Record<string, unknown> = normalized
        ? { ...normalized }
        : {};
      details.name = exception.name;
      details.stack = exception.stack;
      payload.error = details;
    } else if (exception instanceof Error) {
      payload.error = {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    } else {
      payload.error = { message: String(exception) };
    }
    // Log 5xx as error and 4xx as warn; but skip known noisy routes entirely
    if (!isNoise) {
      if (status >= 500) {
        this.logger.error(payload);
      } else {
        this.logger.warn(payload);
      }
    }

    // Re-emit the exception response without altering shape
    if (exception instanceof HttpException) {
      response.status(status).json(exception.getResponse());
    } else {
      const internalMessage = toLocalizedString(
        this.i18n,
        'common.errors.internal_server_error',
        lang,
        'Internal server error',
      );
      response.status(status).json({
        statusCode: status,
        message: internalMessage,
      });
    }
  }
}

function normalizeHttpException(
  res: unknown,
  lang?: string,
  i18n?: I18nService,
): Record<string, unknown> | undefined {
  if (res == null) return undefined;
  if (typeof res === 'string') return { message: res };
  if (typeof res === 'object') {
    try {
      // Clone plain objects into a serializable shape
      return JSON.parse(JSON.stringify(res)) as Record<string, unknown>;
    } catch {
      return {
        message: toLocalizedString(
          i18n!,
          'common.errors.unknown_error',
          lang,
          'Unknown error',
        ),
      };
    }
  }
  return {
    message: toLocalizedString(
      i18n!,
      'common.errors.unknown_error',
      lang,
      'Unknown error',
    ),
  };
}

function toLocalizedString(
  i18n: I18nService,
  key: string,
  lang?: string,
  fallback?: string,
): string {
  const raw = i18n?.t?.(key, { lang });
  if (typeof raw === 'string') return raw;
  try {
    return JSON.stringify(raw);
  } catch {
    return fallback ?? key;
  }
}

// Noisy route matcher: suppress frontend dev/HMR and static asset routes
function isNoiseRoute(
  method: string,
  url: string,
  statusCode: number,
): boolean {
  const isGet = method.toUpperCase() === 'GET';
  const u = (url || '').toLowerCase();
  // Common dev noise (Vite, HMR, SockJS) and static asset paths
  const patterns = [
    /^\/[@]vite(?:\/|$)/, // /@vite/*
    /^\/vite(?:\/|$)/, // /vite/* (fallback)
    /^\/sockjs-node(?:\/|$)/, // CRA/Webpack dev server HMR
    /^\/assets\//, // static assets
    /^\/static\//,
    /^\/favicon\.ico$/, // favicon
    /^\/manifest\.json$/,
    /^\/robots\.txt$/,
  ];
  const matched = patterns.some((re) => re.test(u));
  // Suppress only safe/noisy cases: GET requests with non-5xx statuses
  return isGet && matched && statusCode < 500;
}
