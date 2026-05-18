import {
  Injectable,
  Logger,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface WalletDeductResult {
  newBalance: number;
}

export interface WalletCreditResult {
  newBalance: number;
}

interface WalletApiResponse {
  data: WalletDeductResult | WalletCreditResult;
}

@Injectable()
export class WalletClient {
  private readonly logger = new Logger(WalletClient.name);
  private readonly baseUrl: string;

  constructor(private readonly cs: ConfigService) {
    this.baseUrl = cs.get<string>(
      'WALLET_SERVICE_URL',
      'http://wallet-service:3005',
    );
  }

  /**
   * Deduct funds from member wallet (buy order).
   * orderId is used as idempotency key.
   */
  async deduct(
    userId: string,
    amount: number,
    orderId: string,
  ): Promise<WalletDeductResult> {
    try {
      const resp = await axios.post<WalletApiResponse>(
        `${this.baseUrl}/api/v1/internal/wallet/deduct`,
        { userId, amount, orderId },
        { timeout: 10_000 },
      );

      const body = resp.data as unknown as WalletApiResponse;
      return (body.data ?? body) as WalletDeductResult;
    } catch (err) {
      const error = err as AxiosError;
      const status = error.response?.status;
      const message =
        (error.response?.data as Record<string, string>)?.message ??
        'Wallet service error';

      this.logger.error(
        `Wallet deduct failed: status=${status} msg=${message}`,
      );

      if (status !== undefined && status >= 400 && status < 500) {
        throw new BadGatewayException(message);
      }

      throw new ServiceUnavailableException('Wallet service is unavailable');
    }
  }

  /**
   * Credit funds to member wallet (sell order / refund).
   */
  async credit(
    userId: string,
    amount: number,
    orderId: string,
  ): Promise<WalletCreditResult> {
    try {
      const resp = await axios.post<WalletApiResponse>(
        `${this.baseUrl}/api/v1/internal/wallet/credit`,
        { userId, amount, orderId },
        { timeout: 10_000 },
      );

      const body = resp.data as unknown as WalletApiResponse;
      return (body.data ?? body) as WalletCreditResult;
    } catch (err) {
      const error = err as AxiosError;
      const status = error.response?.status;
      const message =
        (error.response?.data as Record<string, string>)?.message ??
        'Wallet service error';

      this.logger.error(
        `Wallet credit failed: status=${status} msg=${message}`,
      );

      throw new ServiceUnavailableException('Wallet service is unavailable');
    }
  }
}
