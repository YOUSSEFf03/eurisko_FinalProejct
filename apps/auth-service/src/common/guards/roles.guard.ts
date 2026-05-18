import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CmsRole } from '../constants';

/**
 * RolesGuard — fine-grained role check AFTER CmsJwtAuthGuard.
 *
 * CmsJwtAuthGuard confirms the request is from a CMS user.
 * RolesGuard confirms the CMS user has the SPECIFIC role required by @Roles().
 *
 * Example: @Roles(CmsRole.ADMINISTRATOR) blocks support_agent and analyst.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<CmsRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — any authenticated CMS user is allowed
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const role = req.headers['x-user-role'] as string | undefined;

    if (!role) {
      throw new UnauthorizedException(
        'Missing x-user-role — request did not pass through gateway',
      );
    }

    if (!required.includes(role as CmsRole)) {
      throw new ForbiddenException(
        `Insufficient role. Required: [${required.join(', ')}]. Got: ${role}`,
      );
    }

    return true;
  }
}
