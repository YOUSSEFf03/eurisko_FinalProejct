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

/**
 * UserProxyService — forwards member and CMS requests to user-service.
 *
 * Identical pattern to WalletProxyService.
 * Injects x-user-id, x-user-email, x-user-role headers so user-service
 * can trust the caller without re-validating the JWT.
 */
@Injectable()
export class UserProxyService {
  private readonly logger = new Logger(UserProxyService.name);
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env['USER_SERVICE_URL'] ?? 'http://user-service:3002';
  }

  async forward(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
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

      return response.data?.data ?? response.data;
    } catch (err) {
      const error = err as AxiosError;

      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }

      this.logger.error(`User-service unreachable: ${error.message}`);
      throw new InternalServerErrorException('User service is unavailable');
    }
  }
}
