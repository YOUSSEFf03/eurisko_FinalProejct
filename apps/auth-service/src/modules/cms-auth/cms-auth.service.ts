import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import {
  CmsUser,
  CmsUserDocument,
} from '../../database/schemas/cms-user.schema';
import {
  CmsLoginDto,
  CreateCmsUserDto,
  CmsChangePasswordDto,
} from './dto/cms-auth.dto';
import { CmsJwtPayload } from '../../common/types/index';
import { CmsRole, KAFKA_CLIENT } from '../../common/constants';
import { AppConfig } from '../../config/app.config';

@Injectable()
export class CmsAuthService {
  private readonly logger = new Logger(CmsAuthService.name);

  constructor(
    @InjectModel(CmsUser.name)
    private readonly cmsUserModel: Model<CmsUserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig>,
    @Inject(KAFKA_CLIENT)
    private readonly kafkaClient: ClientProxy,
  ) {}

  // ─── CMS Login ────────────────────────────────────────────────────────────

  async login(dto: CmsLoginDto): Promise<{
    accessToken: string;
    user: {
      id: string;
      email: string;
      fullName: string;
      role: CmsRole;
      mustChangePassword: boolean;
    };
  }> {
    const user = await this.cmsUserModel
      .findOne({ email: dto.email.toLowerCase(), isActive: true })
      .select('+passwordHash')
      .lean();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: CmsJwtPayload = {
      sub: String(user._id),
      email: user.email,
      role: user.role,
      type: 'cms',
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '8h' });

    this.logger.log(`CMS login: ${user.email} (${user.role})`);

    return {
      accessToken,
      user: {
        id: String(user._id),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  // ─── Create CMS User (Admin only) ────────────────────────────────────────

  async createUser(
    dto: CreateCmsUserDto,
    createdByUserId: string,
  ): Promise<{ id: string; email: string; fullName: string; role: CmsRole }> {
    const existing = await this.cmsUserModel.findOne({
      email: dto.email.toLowerCase(),
    });

    if (existing) {
      throw new ConflictException('A CMS user with this email already exists');
    }

    // Generate secure temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await this.cmsUserModel.create({
      email: dto.email.toLowerCase(),
      fullName: dto.fullName,
      role: dto.role,
      passwordHash,
      mustChangePassword: true,
      isActive: true,
      createdByUserId,
    });

    // Publish Kafka event → notification-service sends provisioning email
    this.kafkaClient.emit('notification.cms.provisioned', {
      userId: String(user._id),
      email: user.email,
      name: user.fullName,
      role: user.role,
      temporaryPassword,
    });

    this.logger.log(
      `CMS user created: ${user.email} (${user.role}) by ${createdByUserId}`,
    );

    return {
      id: String(user._id),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  // ─── List CMS Users (Admin only) ─────────────────────────────────────────

  async listUsers(): Promise<CmsUserDocument[]> {
    return this.cmsUserModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean() as unknown as CmsUserDocument[];
  }

  // ─── Get CMS User by ID ───────────────────────────────────────────────────

  async getUserById(id: string): Promise<CmsUserDocument> {
    const user = await this.cmsUserModel.findById(id).lean();
    if (!user) throw new NotFoundException('CMS user not found');
    return user as CmsUserDocument;
  }

  // ─── Deactivate CMS User (Admin only) ────────────────────────────────────

  async deactivateUser(id: string, requestingUserId: string): Promise<void> {
    if (id === requestingUserId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const user = await this.cmsUserModel.findById(id);
    if (!user) throw new NotFoundException('CMS user not found');

    // Protect the seeded super-admin — first admin can never be deactivated
    const adminCount = await this.cmsUserModel.countDocuments({
      role: CmsRole.ADMINISTRATOR,
      isActive: true,
    });
    if (user.role === CmsRole.ADMINISTRATOR && adminCount <= 1) {
      throw new ForbiddenException('Cannot deactivate the last administrator');
    }

    await this.cmsUserModel.findByIdAndUpdate(id, { isActive: false });
    this.logger.log(
      `CMS user deactivated: ${user.email} by ${requestingUserId}`,
    );
  }

  // ─── Change Password ──────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    dto: CmsChangePasswordDto,
  ): Promise<void> {
    const user = await this.cmsUserModel
      .findById(userId)
      .select('+passwordHash');

    if (!user) throw new NotFoundException('CMS user not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    user.mustChangePassword = false;
    await user.save();

    this.logger.log(`CMS password changed: ${user.email}`);
  }

  // ─── Seed Super Admin (called on bootstrap if no admins exist) ────────────

  async seedSuperAdmin(): Promise<void> {
    const count = await this.cmsUserModel.countDocuments({
      role: CmsRole.ADMINISTRATOR,
    });

    if (count > 0) {
      this.logger.log('Super admin already seeded — skipping');
      return;
    }

    const password = process.env['CMS_SUPER_ADMIN_PASSWORD'] ?? 'Admin@1234!';
    const email =
      process.env['CMS_SUPER_ADMIN_EMAIL'] ?? 'omar@stockmarket.com';

    const passwordHash = await bcrypt.hash(password, 12);

    await this.cmsUserModel.create({
      email: email.toLowerCase(),
      fullName: 'Omar Al-Admin',
      role: CmsRole.ADMINISTRATOR,
      passwordHash,
      mustChangePassword: false,
      isActive: true,
      createdByUserId: null,
    });

    this.logger.log(`✅ Super admin seeded: ${email}`);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private generateTemporaryPassword(): string {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$!';
    return Array.from(randomBytes(12))
      .map((b) => chars[b % chars.length])
      .join('');
  }
}
