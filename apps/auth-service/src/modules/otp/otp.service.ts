import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Model, Types } from 'mongoose';
import {
  OtpVerification,
  OtpVerificationDocument,
} from '../../database/schemas/otp-verification.schema';
import { UserDocument } from '../../database/schemas/user.schema';
import { generateOtp, addMinutes } from '../../utils/auth.util';
import {
  KAFKA_CLIENT,
  OtpPurpose,
  //   NotificationEvent,
} from '../../common/constants';
import { AppConfig } from '../../config/app.config';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectModel(OtpVerification.name)
    private readonly otpModel: Model<OtpVerificationDocument>,
    private readonly configService: ConfigService<AppConfig>,
    @Inject(KAFKA_CLIENT)
    private readonly kafkaClient: ClientProxy,
  ) {}

  // ─── Create & deliver ─────────────────────────────────────────────────────

  /**
   * Invalidates any prior pending OTPs for the user+purpose pair,
   * creates a fresh one, then delivers it.
   *
   * Delivery: prints to console NOW.
   * Later: replace printToConsole() call with kafkaClient.emit() call
   * once the email microservice is ready — the event payload is already
   * being built.
   */
  async createAndSend(user: UserDocument, purpose: OtpPurpose): Promise<void> {
    // Invalidate all prior unused OTPs for this user + purpose
    await this.otpModel.updateMany(
      { userId: user._id, purpose, used: false },
      { $set: { used: true } },
    );

    const code = generateOtp(6);
    const expiresMinutes =
      this.configService.get('otp.expiresMinutes', { infer: true }) ?? 10;
    const expiresAt = addMinutes(new Date(), expiresMinutes);

    await this.otpModel.create({
      userId: user._id,
      code,
      purpose,
      used: false,
      expiresAt,
    });

    // Publish to Kafka → notification-service will send the email
    this.kafkaClient.emit('notification.otp.send', {
      userId: String(user._id),
      email: user.email,
      name: user.fullName,
      otp: code,
      expiresInMinutes: expiresMinutes,
    });

    this.logger.log(`OTP event published for ${user.email}`);

    // Keep console log for development visibility
    this.printToConsole(user.email, user.fullName, code, purpose, expiresAt);
  }

  // ─── Validate ─────────────────────────────────────────────────────────────

  /**
   * Validates an OTP code for a user+purpose.
   * Marks the OTP as used on success.
   * Throws BadRequestException on failure — does NOT throw NotFoundException
   * to avoid leaking whether a user exists.
   */
  async validate(
    userId: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<OtpVerificationDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const otp = await this.otpModel
      .findOne({ userId: userObjectId, purpose })
      .sort({ createdAt: -1 });

    if (!otp) {
      throw new BadRequestException('No pending OTP found. Request a new one.');
    }

    if (otp.used) {
      throw new BadRequestException(
        'OTP has already been used. Request a new one.',
      );
    }

    if (otp.expiresAt < new Date()) {
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    if (otp.code !== code) {
      throw new BadRequestException('Incorrect OTP code.');
    }

    otp.used = true;
    await otp.save();

    return otp;
  }

  /**
   * Checks whether a recently verified OTP exists for a user+purpose.
   * Used by setPassword to confirm the flow wasn't skipped.
   */
  async wasVerified(
    userId: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<boolean> {
    // Must have been used within the last 15 minutes (grace window)
    const since = new Date(Date.now() - 15 * 60 * 1000);
    const userObjectId = new Types.ObjectId(userId);
    const otp = await this.otpModel
      .findOne({
        userId: userObjectId,
        purpose,
        used: true,
        code,
        createdAt: { $gte: since },
      })
      .lean();
    return otp !== null;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private printToConsole(
    email: string,
    name: string,
    code: string,
    purpose: OtpPurpose,
    expiresAt: Date,
  ): void {
    const border = '═'.repeat(52);
    const label =
      purpose === OtpPurpose.EMAIL_VERIFICATION
        ? 'Email Verification'
        : 'Password Reset';

    this.logger.log(
      '\n' +
        [
          `╔${border}╗`,
          `║          OTP — ${label.padEnd(35)}║`,
          `╠${border}╣`,
          `║  To:      ${email.padEnd(41)}║`,
          `║  Name:    ${name.padEnd(41)}║`,
          `║  Code:    ${code.padEnd(41)}║`,
          `║  Expires: ${expiresAt.toISOString().padEnd(41)}║`,
          `╚${border}╝`,
        ].join('\n'),
    );
  }
}
