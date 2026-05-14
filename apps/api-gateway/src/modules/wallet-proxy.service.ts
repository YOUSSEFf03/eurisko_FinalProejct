import {
  Injectable,
  Logger,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';

export interface UserContext {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class WalletProxyService {
  private readonly logger = new Logger(WalletProxyService.name);
  private readonly baseUrl: string;

  constructor() {
    // Read directly from env — same pattern as JwtStrategy in this project
    this.baseUrl =
      process.env['WALLET_SERVICE_URL'] ?? 'http://wallet-service:3005';
  }

  // ─── Forward authenticated member / CMS requests ─────────────────────────

  async forward(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    user: UserContext,
    body?: unknown,
    query?: Record<string, string>,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await axios({
        method,
        url,
        data: body,
        params: query,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.userId,
          'x-user-email': user.email,
          'x-user-role': user.role,
        },
        timeout: 10_000,
      });

      return response.data;
    } catch (err) {
      const error = err as AxiosError;

      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }

      this.logger.error(`Wallet-service unreachable: ${error.message}`);
      throw new InternalServerErrorException('Wallet service is unavailable');
    }
  }

  // ─── Forward Stripe webhook (no user context, raw body) ──────────────────

  async forwardWebhook(body: unknown, signature: string): Promise<unknown> {
    const url = `${this.baseUrl}/api/v1/wallet/deposit/webhook`;

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signature,
        },
        timeout: 10_000,
      });

      return response.data;
    } catch (err) {
      const error = err as AxiosError;

      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }

      this.logger.error(
        `Wallet-service webhook forward failed: ${error.message}`,
      );
      throw new InternalServerErrorException('Wallet service is unavailable');
    }
  }
}
