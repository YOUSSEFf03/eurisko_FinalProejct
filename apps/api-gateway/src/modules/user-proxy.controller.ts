import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { UserProxyService } from './user-proxy.service';
import { AuthenticatedUser } from '../common/guards/jwt.strategy';

interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * UserProxyController — forwards all /members and /cms/members requests
 * to user-service, injecting the authenticated user context as headers.
 *
 * Member routes:
 *   GET  /members/me
 *   PUT  /members/me
 *   GET  /members/me/portfolio
 *
 * CMS routes:
 *   GET   /cms/members
 *   GET   /cms/members/:id
 *   PATCH /cms/members/:id/suspend
 *   PATCH /cms/members/:id/unsuspend
 *   PATCH /cms/members/:id/kyc
 */
@Controller()
export class UserProxyController {
  constructor(private readonly userProxy: UserProxyService) {}

  // ─── Member routes ────────────────────────────────────────────────────────

  @Get('members/me')
  getProfile(@Req() req: AuthRequest) {
    return this.userProxy.forward('GET', '/api/v1/members/me', this.user(req));
  }

  @Put('members/me')
  @HttpCode(HttpStatus.OK)
  updateProfile(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.userProxy.forward(
      'PUT',
      '/api/v1/members/me',
      this.user(req),
      body,
    );
  }

  @Get('members/me/portfolio')
  getPortfolio(@Req() req: AuthRequest) {
    return this.userProxy.forward(
      'GET',
      '/api/v1/members/me/portfolio',
      this.user(req),
    );
  }

  // ─── CMS routes ───────────────────────────────────────────────────────────

  @Get('cms/members')
  listMembers(@Req() req: AuthRequest, @Query() query: Record<string, string>) {
    return this.userProxy.forward(
      'GET',
      '/api/v1/cms/members',
      this.user(req),
      undefined,
      query,
    );
  }

  @Get('cms/members/:id')
  getMember(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.userProxy.forward(
      'GET',
      `/api/v1/cms/members/${id}`,
      this.user(req),
    );
  }

  @Patch('cms/members/:id/suspend')
  @HttpCode(HttpStatus.OK)
  suspendMember(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.userProxy.forward(
      'PATCH',
      `/api/v1/cms/members/${id}/suspend`,
      this.user(req),
      body,
    );
  }

  @Patch('cms/members/:id/unsuspend')
  @HttpCode(HttpStatus.OK)
  unsuspendMember(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.userProxy.forward(
      'PATCH',
      `/api/v1/cms/members/${id}/unsuspend`,
      this.user(req),
    );
  }

  @Patch('cms/members/:id/kyc')
  @HttpCode(HttpStatus.OK)
  updateKyc(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.userProxy.forward(
      'PATCH',
      `/api/v1/cms/members/${id}/kyc`,
      this.user(req),
      body,
    );
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  private user(req: AuthRequest) {
    return {
      userId: req.user?.userId ?? '',
      email: req.user?.email ?? '',
      role: req.user?.role ?? 'member',
    };
  }

  @Get('cms/analytics/member-growth')
  getMemberGrowth(@Req() req: AuthRequest) {
    return this.userProxy.forward(
      'GET',
      '/api/v1/cms/analytics/member-growth',
      this.user(req),
    );
  }
}
