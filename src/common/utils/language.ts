import { type Request as ExpressRequest } from 'express';
import { SupportedLanguage } from '../enums';

export function getPreferredLanguage(
  req: ExpressRequest,
  fallback: SupportedLanguage = SupportedLanguage.EN,
): SupportedLanguage {
  // Query param has priority (e.g., ?lang=en or ?lang=ar)
  const langParam = (req.query?.lang ?? req.headers['x-lang']) as
    | string
    | undefined;
  if (typeof langParam === 'string') {
    // Use safe resolver to avoid unsafe enum comparisons
    return resolveSupportedLanguage(langParam, fallback);
  }

  // Fallback to Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (typeof acceptLanguage === 'string') {
    const first = acceptLanguage.split(',')[0]?.trim().toLowerCase();
    if (first?.startsWith('ar')) return SupportedLanguage.AR;
    if (first?.startsWith('en')) return SupportedLanguage.EN;
  }

  return fallback;
}

/**
 * Safely resolve a SupportedLanguage value from either a string (e.g., 'en'/'ar')
 * or an existing SupportedLanguage enum value without unsafe enum comparisons.
 */
export function resolveSupportedLanguage(
  input?: string | SupportedLanguage,
  fallback: SupportedLanguage = SupportedLanguage.EN,
): SupportedLanguage {
  if (!input) return fallback;
  if (typeof input === 'string') {
    const v = input.toLowerCase();
    if (v === 'ar') return SupportedLanguage.AR;
    return SupportedLanguage.EN;
  }
  // Already an enum value
  return input;
}
