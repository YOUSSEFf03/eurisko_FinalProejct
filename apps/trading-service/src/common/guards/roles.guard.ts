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
      throw new UnauthorizedException('Missing x-user-role header');
    }

    if (!required.includes(role as CmsRole)) {
      throw new ForbiddenException(
        `Insufficient role. Required: [${required.join(', ')}]. Got: ${role}`,
      );
    }

    return true;
  }
}
