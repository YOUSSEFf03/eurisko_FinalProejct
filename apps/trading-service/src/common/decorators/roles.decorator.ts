import { SetMetadata } from '@nestjs/common';
import { CmsRole } from '../constants';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: CmsRole[]) => SetMetadata(ROLES_KEY, roles);
