import { SetMetadata } from '@nestjs/common';

export const SKIP_ENVELOPE_KEY = 'skipEnvelope';

/**
 * Use this decorator on controller methods to opt-out of the
 * global ResponseEnvelopeInterceptor (e.g., for 204 No Content).
 */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);
