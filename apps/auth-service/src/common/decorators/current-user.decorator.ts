import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../types';

export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
