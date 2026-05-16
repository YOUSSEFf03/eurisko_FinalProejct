import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { TokenService } from '../token/token.service';
import { OtpService } from '../otp/otp.service';
import {
  hashPassword,
  comparePassword,
  compareToken,
  calculateAge,
} from '../../utils/auth.util';
import {
  OtpPurpose,
  UserStatus,
  MIN_MEMBER_AGE,
  KAFKA_CLIENT,
} from '../../common/constants';
import { RegisterDto } from './dto/register.dto';
import {
  SetPasswordDto,
  VerifyOtpDto,
  ResendOtpDto,
} from './dto/verify-otp.dto';
import {
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/login.dto';
import { TokenPair, MemberProfile } from '../../common/types';
import { OnModuleInit } from '@nestjs/common';
export interface LoginResult extends TokenPair {
  member: MemberProfile;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    @Inject(KAFKA_CLIENT)
    private readonly kafkaClient: ClientProxy,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  // ─── Registration flow ────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.userModel
      .findOne({ $or: [{ email: dto.email }, { nationalId: dto.nationalId }] })
      .lean();

    if (existing?.email === dto.email) {
      throw new ConflictException('An account with this email already exists');
    }
    if (existing?.nationalId === dto.nationalId) {
      throw new ConflictException(
        'An account with this national ID already exists',
      );
    }

    const age = calculateAge(new Date(dto.dateOfBirth));
    if (age < MIN_MEMBER_AGE) {
      throw new BadRequestException(
        `You must be at least ${MIN_MEMBER_AGE} years old to register`,
      );
    }

    // passwordHash is set to a placeholder — account is inactive
    // until set-password completes after OTP verification.
    const user = await this.userModel.create({
      fullName: dto.fullName,
      email: dto.email,
      nationalId: dto.nationalId,
      dateOfBirth: new Date(dto.dateOfBirth),
      passwordHash: 'PENDING',
      status: UserStatus.PENDING_VERIFICATION,
      emailVerified: false,
    });

    await this.otpService.createAndSend(user, OtpPurpose.EMAIL_VERIFICATION);

    this.logger.log(`New registration: ${dto.email}`);

    return {
      message: 'Registration successful. Check your console (dev) for the OTP.',
    };
  }

  // ─── OTP step ─────────────────────────────────────────────────────────────

  async verifyOtp(dto: VerifyOtpDto): Promise<{ message: string }> {
    const user = await this.findUserByEmailOrFail(dto.email);
    await this.otpService.validate(
      String(user._id),
      dto.code,
      OtpPurpose.EMAIL_VERIFICATION,
    );
    return { message: 'OTP verified. Proceed to set your password.' };
  }

  async resendOtp(dto: ResendOtpDto): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) {
      // Return success anyway — do not reveal whether email exists
      return {
        message: 'If that email is registered, a new OTP has been sent.',
      };
    }
    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }
    await this.otpService.createAndSend(user, OtpPurpose.EMAIL_VERIFICATION);
    return { message: 'A new OTP has been sent.' };
  }

  // ─── Set password (step 3 of registration) ────────────────────────────────

  async setPassword(dto: SetPasswordDto): Promise<{ message: string }> {
    const user = await this.userModel
      .findOne({ email: dto.email })
      .select('+passwordHash');

    if (!user) throw new NotFoundException('User not found');

    const verified = await this.otpService.wasVerified(
      String(user._id),
      dto.code,
      OtpPurpose.EMAIL_VERIFICATION,
    );
    if (!verified) {
      throw new BadRequestException(
        'OTP not verified or session expired. Please re-verify.',
      );
    }

    user.passwordHash = await hashPassword(dto.password);
    user.emailVerified = true;
    user.status = UserStatus.ACTIVE;
    await user.save();

    // ── Publish member.registered ─────────────────────────────────────────────
    // Fire-and-forget: user-service consumes this to create the Member document.
    // Wrapped in try/catch — a Kafka failure must NEVER roll back a successful
    // account activation. The user is already active in MongoDB.
    try {
      this.kafkaClient.emit('member.registered', {
        userId: String(user._id),
        fullName: user.fullName,
        email: user.email,
        nationalId: user.nationalId,
        dateOfBirth: user.dateOfBirth.toISOString(),
      });
      this.logger.log(`member.registered emitted | email=${dto.email}`);
    } catch (err) {
      // Non-fatal — log and continue. Ops team can replay from DB if needed.
      this.logger.error(
        `Failed to emit member.registered | email=${dto.email}`,
        err,
      );
    }

    return { message: 'Password set successfully. You can now log in.' };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.userModel
      .findOne({ email: dto.email })
      .select('+passwordHash +refreshTokenHash');

    // Return the same error for "user not found" and "wrong password"
    // to prevent account enumeration.
    const INVALID_CREDS = 'Invalid email or password';

    if (!user) throw new UnauthorizedException(INVALID_CREDS);

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Email not verified. Please complete registration.',
      );
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException(
        `Account suspended${user.suspensionReason ? `: ${user.suspensionReason}` : ''}`,
      );
    }

    const valid = await comparePassword(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException(INVALID_CREDS);

    const tokens = await this.tokenService.issueTokenPair(user);

    this.logger.log(`Login: ${dto.email}`);

    return {
      ...tokens,
      member: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        walletBalance: user.walletBalance,
        status: user.status,
        kycStatus: user.kycStatus,
      },
    };
  }

  // ─── Token rotation ───────────────────────────────────────────────────────

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    let payload;
    try {
      payload = await this.tokenService.verifyRefreshToken(dto.refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userModel
      .findById(payload.sub)
      .select('+refreshTokenHash');

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException(
        'Session not found. Please log in again.',
      );
    }

    const match = await compareToken(dto.refreshToken, user.refreshTokenHash);
    if (!match) {
      // Possible token reuse — revoke all sessions
      await this.tokenService.revokeRefreshToken(String(user._id));
      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions revoked.',
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account suspended');
    }

    return this.tokenService.issueTokenPair(user);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<{ message: string }> {
    await this.tokenService.revokeRefreshToken(userId);
    return { message: 'Logged out successfully' };
  }

  // ─── Password reset ───────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email: dto.email });
    if (user) {
      await this.otpService.createAndSend(user, OtpPurpose.PASSWORD_RESET);
    }
    // Always return the same message — no email enumeration
    return {
      message: 'If that email is registered, a reset OTP has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userModel
      .findOne({ email: dto.email })
      .select('+passwordHash');

    if (!user) throw new NotFoundException('User not found');

    await this.otpService.validate(
      String(user._id),
      dto.code,
      OtpPurpose.PASSWORD_RESET,
    );

    user.passwordHash = await hashPassword(dto.newPassword);
    await user.save();

    // Revoke all active sessions after a password change
    await this.tokenService.revokeRefreshToken(String(user._id));

    this.logger.log(`Password reset: ${dto.email}`);
    return { message: 'Password reset successfully. Please log in.' };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findUserByEmailOrFail(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
