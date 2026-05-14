import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible — skips the x-user-id header check.
 *
 * Used on the Stripe webhook route only.
 * Stripe calls this directly (not via the gateway), so no x-user-id header exists.
 *
 * @example
 *   @Public()
 *   @Post('deposit/webhook')
 *   handleWebhook() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
