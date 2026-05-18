import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CmsJwtAuthGuard implements CanActivate {
  private static readonly CMS_ROLES = new Set([
    'administrator',
    'support_agent',
    'analyst',
  ]);

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
