import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const url = req.url;
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const start = Date.now();

    this.logger.log(`→ [${method}] ${url}  (ip: ${ip})`);

    return next.handle().pipe(
      tap(() => {
        const res = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
        const duration = Date.now() - start;
        this.logger.log(
          `← [${method}] ${url}  ${res.statusCode}  ${duration}ms`,
        );
      }),
      catchError((err: unknown) => {
        const duration = Date.now() - start;
        const status =
          err instanceof Error && 'status' in err
            ? (err as { status: number }).status
            : 500;
        this.logger.warn(`← [${method}] ${url}  ${status}  ${duration}ms`);
        return throwError(() => err);
      }),
    );
  }
}
