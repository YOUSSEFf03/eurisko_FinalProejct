import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

/**
 * Measures the handler execution time only (after guards, pipes).
 * Complements LoggerMiddleware which measures full HTTP round-trip.
 * Useful for isolating slow business logic vs slow network.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Handler');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const cls = context.getClass().name;
    const fn = context.getHandler().name;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.debug(`${cls}.${fn}  ${Date.now() - start}ms`);
      }),
      catchError((err: unknown) => {
        this.logger.error(
          `${cls}.${fn} threw  ${Date.now() - start}ms`,
          err instanceof Error ? err.stack : String(err),
        );
        return throwError(() => err);
      }),
    );
  }
}
