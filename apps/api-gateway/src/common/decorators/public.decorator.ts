// ─── public.decorator.ts ─────────────────────────────────────────────────────
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible (no JWT required).
 *
 * @example
 *   @Public()
 *   @Post('register')
 *   register(@Body() dto: RegisterDto) { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
