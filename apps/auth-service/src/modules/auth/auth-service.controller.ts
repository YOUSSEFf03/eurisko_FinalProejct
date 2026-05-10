import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService, LoginResult } from './auth-service.service';
import { RegisterDto } from './dto/register.dto';
import {
  VerifyOtpDto,
  SetPasswordDto,
  ResendOtpDto,
} from './dto/verify-otp.dto';
import {
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TokenPair } from '../../common/types/index';

/**
 * AuthController
 *
 * Public routes (no guard):
 *   POST /auth/register        — step 1: create account
 *   POST /auth/verify-otp      — step 2: confirm OTP
 *   POST /auth/set-password    — step 3: activate account
 *   POST /auth/resend-otp      — resend OTP
 *   POST /auth/login           — get token pair
 *   POST /auth/refresh         — rotate tokens
 *   POST /auth/forgot-password — request reset OTP
 *   POST /auth/reset-password  — apply new password
 *
 * Protected routes (JwtAuthGuard):
 *   POST /auth/logout          — revoke session
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Registration ───────────────────────────────────────────────────────────

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto): Promise<{ message: string }> {
    return this.authService.register(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ message: string }> {
    return this.authService.verifyOtp(dto);
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  setPassword(@Body() dto: SetPasswordDto): Promise<{ message: string }> {
    return this.authService.setPassword(dto);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resendOtp(@Body() dto: ResendOtpDto): Promise<{ message: string }> {
    return this.authService.resendOtp(dto);
  }

  // ─── Session ─────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser('sub') userId: string): Promise<{ message: string }> {
    return this.authService.logout(userId);
  }

  // ─── Password reset ──────────────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }
}
