import { SetMetadata } from '@nestjs/common';

export const SUCCESS_MESSAGE_KEY = 'successMessageKey';

/**
 * Use this decorator on controller methods to set a success i18n key
 * for the global ResponseEnvelopeInterceptor.
 * Example: @SuccessMessage('common.messages.countries_list')
 */
export const SuccessMessage = (key: string) =>
  SetMetadata(SUCCESS_MESSAGE_KEY, key);
