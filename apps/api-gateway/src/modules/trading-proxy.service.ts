import {
  Injectable,
  Logger,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface UserContext {
  userId: string;
  email: string;
  role: string;
}

@Injectable()
export class TradingProxyService {
  private readonly logger = new Logger(TradingProxyService.name);
  private readonly baseUrl: string;

  constructor(private readonly cs: ConfigService) {
    this.baseUrl =
      cs.get<string>('TRADING_SERVICE_URL') ?? 'http://trading-service:3006';
  }

  async forward(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    user: UserContext,
    body?: unknown,
    query?: Record<string, string>,
  ): Promise<unknown> {
    const url = `${this.baseUrl}/api/v1${path}`;

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
        timeout: 30_000,
      });

      return response.data;
    } catch (err) {
      const error = err as AxiosError;

      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }

      this.logger.error(`Trading-service unreachable: ${error.message}`);
      throw new InternalServerErrorException('Trading service is unavailable');
    }
  }
}
