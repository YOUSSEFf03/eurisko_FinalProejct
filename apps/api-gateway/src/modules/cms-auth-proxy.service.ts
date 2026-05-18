import {
  Injectable,
  Logger,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { AuthenticatedUser } from '../common/guards/jwt.strategy';

@Injectable()
export class CmsAuthProxyService {
  private readonly logger = new Logger(CmsAuthProxyService.name);
  private readonly baseUrl =
    process.env['AUTH_SERVICE_URL'] ?? 'http://auth-service:3003';

  async forward(
    method: 'POST' | 'GET' | 'DELETE',
    path: string,
    user?: AuthenticatedUser,
    body?: unknown,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (user) {
      headers['x-user-id'] = user.userId;
      headers['x-user-email'] = user.email;
      headers['x-user-role'] = user.role;
    }
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}/api/v1${path}`,
        data: body,
        headers,
        timeout: 10_000,
      });
      return response.data?.data ?? response.data;
    } catch (err) {
      const error = err as AxiosError;
      if (error.response)
        throw new HttpException(error.response.data, error.response.status);
      this.logger.error(`Auth-service unreachable: ${error.message}`);
      throw new InternalServerErrorException('Auth service is unavailable');
    }
  }
}
