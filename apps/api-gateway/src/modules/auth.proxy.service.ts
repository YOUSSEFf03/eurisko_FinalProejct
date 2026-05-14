import {
  Injectable,
  Logger,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';

@Injectable()
export class AuthProxyService {
  private readonly logger = new Logger(AuthProxyService.name);
  private readonly baseUrl: string;

  constructor() {
    // Read directly from env — same pattern as JwtStrategy in this project
    this.baseUrl =
      process.env['AUTH_SERVICE_URL'] ?? 'http://auth-service:3003';
  }

  async forward(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await axios({
        method,
        url,
        data: body,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: 10_000,
      });

      // Auth-service already wraps in { success, statusCode, data }
      // Return the inner data only — gateway TransformInterceptor re-wraps
      return response.data?.data ?? response.data;
    } catch (err) {
      const error = err as AxiosError;

      if (error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }

      this.logger.error(`Auth-service unreachable: ${error.message}`);
      throw new InternalServerErrorException('Auth service is unavailable');
    }
  }
}
