import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthProxyService } from './auth.proxy.service';
import { Public } from '../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
@Public()
@Throttle({ auth: { limit: 10, ttl: 60_000 } })
export class AuthProxyController {
  constructor(private readonly authProxy: AuthProxyService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: unknown) {
    return this.authProxy.forward('POST', '/api/v1/auth/register', body);
    // ✅ fixed: was /api/v1/auth/register
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() body: unknown) {
    return this.authProxy.forward('POST', '/api/v1/auth/verify-otp', body);
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  setPassword(@Body() body: unknown) {
    return this.authProxy.forward('POST', '/api/v1/auth/set-password', body);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  resendOtp(@Body() body: unknown) {
    return this.authProxy.forward('POST', '/api/v1/auth/resend-otp', body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: unknown) {
    return this.authProxy.forward('POST', '/api/v1/auth/login', body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: unknown) {
    return this.authProxy.forward('POST', '/api/v1/auth/refresh', body);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() body: unknown, @Req() req: Request) {
    const headers = this.extractAuthHeader(req);
    return this.authProxy.forward('POST', '/api/v1/auth/logout', body, headers);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: unknown) {
    return this.authProxy.forward('POST', '/api/v1/auth/forgot-password', body);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: unknown) {
    return this.authProxy.forward('POST', '/api/v1/auth/reset-password', body);
  }

  private extractAuthHeader(req: Request): Record<string, string> {
    const auth = req.headers['authorization'];
    return auth ? { authorization: auth } : {};
  }
}
