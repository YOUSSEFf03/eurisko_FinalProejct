import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/**
 * CmsJwtAuthGuard
 *
 * Checks that the incoming request carries an x-user-role header
 * containing a valid CMS role (administrator | support_agent | analyst).
 *
 * The api-gateway already verified the JWT and injected the role header.
 * This guard simply ensures a plain member cannot reach CMS routes.
 *
 * Applied at controller level on all /cms/* routes.
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
