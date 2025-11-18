import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { SupportedLanguage } from '../enums';

/**
 * Adds language header options to Swagger for public APIs.
 * - Accept-Language: standard header for language preference
 * - x-lang: alternative simple header (en/ar)
 */
export function ApiAcceptLanguage() {
  return applyDecorators(
    ApiHeader({
      name: 'Accept-Language',
      required: false,
      enum: SupportedLanguage,
      description: 'Preferred response language (en/ar)',
    }),
    ApiHeader({
      name: 'x-lang',
      required: false,
      enum: SupportedLanguage,
      description: 'Alternative language header (en/ar)',
    }),
  );
}
