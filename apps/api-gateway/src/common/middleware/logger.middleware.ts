import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { REQUEST_ID_HEADER } from './request-id.middleware';

/**
 * Logs every HTTP request and its outcome with timing.
 * Mirrors the LoggingInterceptor in auth-service but at the middleware
 * level so nginx-forwarded headers (real IP, forwarded-for) are captured.
 *
 * Format:
 *   → [POST] /api/v1/auth/login  (ip: 1.2.3.4)  rid: abc-123
 *   ← [POST] /api/v1/auth/login  201  47ms
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl } = req;
    const requestId = req.headers[REQUEST_ID_HEADER] as string;
    // Respect X-Real-IP set by nginx
    const ip =
      (req.headers['x-real-ip'] as string) ??
      req.ip ??
      req.socket.remoteAddress ??
      'unknown';
    const start = Date.now();

    this.logger.log(
      `→ [${method}] ${originalUrl}  (ip: ${ip})  rid: ${requestId}`,
    );

    res.on('finish', () => {
      const ms = Date.now() - start;
      const { statusCode } = res;
      const log = `← [${method}] ${originalUrl}  ${statusCode}  ${ms}ms`;

      if (statusCode >= 500) this.logger.error(log);
      else if (statusCode >= 400) this.logger.warn(log);
      else this.logger.log(log);
    });

    next();
  }
}
