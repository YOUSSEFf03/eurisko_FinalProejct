import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../guards/jwt.strategy';

/**
 * Extracts the authenticated user or a specific field from req.user.
 *
 * @example
 *   // Full object
 *   getProfile(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 *   // Just the userId
 *   getWallet(@CurrentUser('userId') userId: string) { ... }
 *
 * Note: auth-service uses @CurrentUser('sub') because its payload has `sub`.
 * Gateway normalises the payload to { userId, email, role }, so use 'userId'.
 */
export const CurrentUser = createParamDecorator(
  (
    field: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | string => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    return field ? req.user?.[field] : req.user;
  },
);
