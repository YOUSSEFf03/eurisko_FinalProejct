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
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CmsAuthService } from './cms-auth.service';
import {
  CmsLoginDto,
  CreateCmsUserDto,
  CmsChangePasswordDto,
} from './dto/cms-auth.dto';
import { CmsJwtAuthGuard } from '../../common/guards/cms-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CmsRole } from '../../common/constants';

interface CmsRequest extends Request {
  user?: { userId: string; email: string; role: string };
  headers: Request['headers'] & {
    'x-user-id'?: string;
    'x-user-role'?: string;
  };
}

/**
 * CmsAuthController
 *
 * Public routes (no JWT required):
 *   POST /cms/auth/login
 *
 * Authenticated CMS routes (JWT required via gateway):
 *   POST   /cms/auth/users              — create new CMS user (Admin only)
 *   GET    /cms/auth/users              — list all CMS users (Admin only)
 *   DELETE /cms/auth/users/:id          — deactivate CMS user (Admin only)
 *   POST   /cms/auth/change-password    — change own password (any CMS user)
 */
@Controller('cms/auth')
export class CmsAuthController {
  constructor(private readonly cmsAuthService: CmsAuthService) {}

  // ─── Public: CMS Login ────────────────────────────────────────────────────

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: CmsLoginDto) {
    return this.cmsAuthService.login(dto);
  }

  // ─── Admin: Create CMS User ───────────────────────────────────────────────

  @Post('users')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() dto: CreateCmsUserDto, @Req() req: CmsRequest) {
    const createdByUserId = req.headers['x-user-id'] ?? '';
    return this.cmsAuthService.createUser(dto, createdByUserId as string);
  }

  // ─── Admin: List CMS Users ────────────────────────────────────────────────

  @Get('users')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR)
  listUsers() {
    return this.cmsAuthService.listUsers();
  }

  // ─── Admin: Get CMS User by ID ────────────────────────────────────────────

  @Get('users/:id')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR)
  getUserById(@Param('id') id: string) {
    return this.cmsAuthService.getUserById(id);
  }

  // ─── Admin: Deactivate CMS User ───────────────────────────────────────────

  @Delete('users/:id')
  @UseGuards(CmsJwtAuthGuard, RolesGuard)
  @Roles(CmsRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  deactivateUser(@Param('id') id: string, @Req() req: CmsRequest) {
    const requestingUserId = req.headers['x-user-id'] ?? '';
    return this.cmsAuthService.deactivateUser(id, requestingUserId as string);
  }

  // ─── Any CMS user: Change Password ───────────────────────────────────────

  @Post('change-password')
  @UseGuards(CmsJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(@Body() dto: CmsChangePasswordDto, @Req() req: CmsRequest) {
    const userId = req.headers['x-user-id'] ?? '';
    return this.cmsAuthService.changePassword(userId as string, dto);
  }
}
