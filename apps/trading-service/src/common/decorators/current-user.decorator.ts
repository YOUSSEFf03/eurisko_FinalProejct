import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export interface RequestUser {
  userId: string;
  email: string;
  role: string;
}

/**
 * Extracts the authenticated user from x-user-id/x-user-email/x-user-role
 * headers injected by the api-gateway. Trading-service never validates JWT directly.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest<Request>();

    const userId = req.headers['x-user-id'] as string | undefined;
    const email = req.headers['x-user-email'] as string | undefined;
    const role = req.headers['x-user-role'] as string | undefined;

    if (!userId) {
      throw new UnauthorizedException(
        'Missing x-user-id — request did not pass through gateway',
      );
    }

    return { userId, email: email ?? '', role: role ?? 'member' };
  },
);
