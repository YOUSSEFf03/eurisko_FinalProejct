import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../guards/jwt.strategy';

export const ROLES_KEY = 'roles';

/**
 * Declares required roles on a route. Enforced by RolesGuard.
 * admin implicitly passes all lower-role checks.
 *
 * @example
 *   @Roles('admin', 'analyst')
 *   @Get('analytics/aum')
 *   getAum() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
