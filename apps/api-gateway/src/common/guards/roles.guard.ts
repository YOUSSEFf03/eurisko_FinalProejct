import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser, UserRole } from './jwt.strategy';

/**
 * Role hierarchy — higher index = more privilege.
 * admin implicitly passes any lower-role check.
 *
 * member (0) < support_agent (1) < analyst (2) < admin (3)
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 0,
  support_agent: 1,
  analyst: 2,
  admin: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → any authenticated user may access
    if (!required || required.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();

    if (!user) throw new ForbiddenException('No user on request');

    const userLevel = ROLE_HIERARCHY[user.role] ?? -1;
    const allowed = required.some((r) => userLevel >= ROLE_HIERARCHY[r]);

    if (!allowed) {
      throw new ForbiddenException(
        `Access denied. Required: [${required.join(', ')}]. Your role: ${user.role}`,
      );
    }

    return true;
  }
}
