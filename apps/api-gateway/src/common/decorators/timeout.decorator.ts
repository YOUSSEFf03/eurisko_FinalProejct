import { SetMetadata } from '@nestjs/common';

export const TIMEOUT_KEY = 'timeout';

/**
 * Per-route timeout override.
 * Use on heavy analytics or export endpoints.
 *
 * @example
 *   @Timeout(60_000)
 *   @Get('analytics/aum')
 *   getAum() { ... }
 */
export const Timeout = (ms: number) => SetMetadata(TIMEOUT_KEY, ms);
