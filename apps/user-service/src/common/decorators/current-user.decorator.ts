import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Extracts the authenticated user context from headers injected by the api-gateway.
 *
 * The gateway validates the JWT once and forwards:
 *   x-user-id    → member's userId (sub claim)
 *   x-user-role  → member | administrator | analyst | support_agent
 *   x-user-email → member's email
 *
 * User-service never touches JWT directly for member routes.
 * CMS routes use CmsJwtAuthGuard which validates the JWT itself.
 */
export interface RequestUser {
  userId: string;
  role: string;
  email: string;
}

export const CurrentUser = createParamDecorator(
  (field: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();

    const userId = req.headers['x-user-id'] as string | undefined;
    const role = req.headers['x-user-role'] as string | undefined;
    const email = req.headers['x-user-email'] as string | undefined;

    if (!userId) {
      throw new UnauthorizedException(
        'Missing x-user-id — request did not pass through gateway',
      );
    }

    const user: RequestUser = {
      userId,
      role: role ?? 'member',
      email: email ?? '',
    };

    return field ? user[field] : user;
  },
);
