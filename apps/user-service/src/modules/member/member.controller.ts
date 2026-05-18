import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MemberService } from './member.service';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import { CmsKycDto } from './dto/cms-kyc.dto';
import { CmsSuspendDto } from './dto/cms-suspend.dto';
import { CmsJwtAuthGuard } from '../../common/guards/cms-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { CmsRole } from '../../common/constants';

/**
 * MemberController
 *
 * Member routes (trusted x-user-id header from gateway):
 *   GET  /members/me            — own profile
 *   PUT  /members/me            — update own profile
 *   GET  /members/me/portfolio  — own portfolio (placeholder)
 *
 * CMS routes (CmsJwtAuthGuard + RolesGuard):
 *   GET   /cms/members                          — list all members
 *   GET   /cms/members/:id                      — get member by id
 *   PATCH /cms/members/:id/suspend              — suspend member
 *   PATCH /cms/members/:id/unsuspend            — unsuspend member
 *   PATCH /cms/members/:id/kyc                  — approve/reject KYC
 */
@Controller()
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  // ─── Member routes ────────────────────────────────────────────────────────

  @Get('members/me')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.memberService.getProfile(user.userId);
  }

  @Put('members/me')
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.memberService.updateProfile(user.userId, dto);
  }

  @Get('members/me/portfolio')
  getPortfolio(@CurrentUser() user: RequestUser) {
    return this.memberService.getPortfolio(user.userId);
  }

  // ─── CMS routes ───────────────────────────────────────────────────────────

  @Get('cms/members')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR, CmsRole.SUPPORT_AGENT, CmsRole.ANALYST)
  listMembers(@Query() query: MemberQueryDto) {
    return this.memberService.listMembers(query);
  }

  @Get('cms/members/:id')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR, CmsRole.SUPPORT_AGENT, CmsRole.ANALYST)
  getMember(@Param('id', ParseObjectIdPipe) id: string) {
    return this.memberService.getMemberById(id);
  }

  @Patch('cms/members/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR, CmsRole.SUPPORT_AGENT)
  suspendMember(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CmsSuspendDto,
  ) {
    return this.memberService.suspendMember(id, dto);
  }

  @Patch('cms/members/:id/unsuspend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR, CmsRole.SUPPORT_AGENT)
  unsuspendMember(@Param('id', ParseObjectIdPipe) id: string) {
    return this.memberService.unsuspendMember(id);
  }

  @Patch('cms/members/:id/kyc')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR)
  updateKyc(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CmsKycDto,
  ) {
    return this.memberService.updateKyc(id, dto);
  }

  @Get('cms/analytics/member-growth')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR)
  getMemberGrowth() {
    return this.memberService.getMemberGrowth();
  }
}
