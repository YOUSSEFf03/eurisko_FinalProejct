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
 * RolesGuard — reads x-user-role header injected by the api-gateway.
 *
 * The gateway already verified the JWT and placed the role in the header.
 * This guard only checks whether that role satisfies @Roles() on the route.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<CmsRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

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
