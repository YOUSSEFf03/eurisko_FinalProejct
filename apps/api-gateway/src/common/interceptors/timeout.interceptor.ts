import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { TIMEOUT_KEY } from '../decorators/timeout.decorator';

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Kills any handler exceeding the timeout.
 * Override per route with @Timeout(ms).
 * Heavy analytics queries should use @Timeout(60_000).
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ms =
      this.reflector.getAllAndOverride<number>(TIMEOUT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_TIMEOUT_MS;

    return next.handle().pipe(
      timeout(ms),
      catchError((err: unknown) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException(`Request timed out after ${ms}ms`),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
