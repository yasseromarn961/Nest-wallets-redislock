import { HttpException } from '@nestjs/common';
import type { I18nService } from 'nestjs-i18n';

/**
 * Convert an Axios-like error into an HttpException that preserves the
 * external service's status code and payload as-is.
 *
 * If the error does not contain a response (e.g., network issue), we return
 * 502 Bad Gateway with a localized fallback message when possible.
 */
export function toHttpExceptionFromExternal(
  err: unknown,
  i18n?: I18nService,
): HttpException {
  const e = err as any;
  const hasResponse =
    e && typeof e === 'object' && 'response' in e && e.response;
  if (hasResponse) {
    const status: number =
      typeof e.response?.status === 'number' ? e.response.status : 500;
    let data = e.response?.data;

    // Ensure the payload is a serializable object
    if (data == null) {
      data = {
        message: fallbackMessage(
          i18n,
          'common.errors.external_service_error',
          'External service error',
        ),
      };
    } else if (typeof data !== 'object') {
      data = { message: String(data) };
    }

    return new HttpException(data, status);
  }

  // No response: likely network/DNS/timeout or unexpected error
  const message = fallbackMessage(
    i18n,
    'common.errors.external_service_unavailable',
    'External service unavailable',
  );
  return new HttpException({ message }, 502);
}

function fallbackMessage(
  i18n: I18nService | undefined,
  key: string,
  defaultText: string,
): string {
  try {
    const translated = i18n?.t?.(key);
    return typeof translated === 'string' ? translated : defaultText;
  } catch {
    return defaultText;
  }
}
