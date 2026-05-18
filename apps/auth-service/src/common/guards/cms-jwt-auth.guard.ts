import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * CmsJwtAuthGuard
 *
 * Checks that the request carries an x-user-role header with a CMS role.
 * The api-gateway already verified the JWT and injected the role header.
 * We only need to confirm this is NOT a plain member request hitting a CMS route.
 *
 * CMS roles: administrator | support_agent | analyst
 */
@Injectable()
export class CmsJwtAuthGuard implements CanActivate {
  private static readonly CMS_ROLES = new Set([
    'administrator',
    'support_agent',
    'analyst',
  ]);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const role = req.headers['x-user-role'] as string | undefined;

    if (!role) {
      throw new UnauthorizedException(
        'Missing x-user-role — request did not pass through gateway',
      );
    }

    if (!CmsJwtAuthGuard.CMS_ROLES.has(role)) {
      throw new UnauthorizedException('This route requires a CMS account');
    }

    return true;
  }
}
