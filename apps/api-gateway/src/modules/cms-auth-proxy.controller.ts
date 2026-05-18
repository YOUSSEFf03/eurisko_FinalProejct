import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/guards/jwt.strategy';
import { CmsAuthProxyService } from './cms-auth-proxy.service';

interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

@Controller('cms/auth')
export class CmsAuthProxyController {
  constructor(private readonly proxy: CmsAuthProxyService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  login(@Body() body: unknown) {
    return this.proxy.forward('POST', '/cms/auth/login', undefined, body);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() body: unknown, @Req() req: AuthRequest) {
    return this.proxy.forward('POST', '/cms/auth/users', req.user, body);
  }

  @Get('users')
  listUsers(@Req() req: AuthRequest) {
    return this.proxy.forward('GET', '/cms/auth/users', req.user);
  }

  @Get('users/:id')
  getUserById(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.proxy.forward('GET', `/cms/auth/users/${id}`, req.user);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  deactivateUser(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.proxy.forward('DELETE', `/cms/auth/users/${id}`, req.user);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@Body() body: unknown, @Req() req: AuthRequest) {
    return this.proxy.forward(
      'POST',
      '/cms/auth/change-password',
      req.user,
      body,
    );
  }
}
