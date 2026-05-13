import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware';

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  timestamp: string;
  requestId: string;
}

/**
 * Wraps every successful response in the platform envelope.
 * Matches the ResponseTransformInterceptor shape in auth-service
 * plus adds requestId for tracing.
 *
 * Errors bypass this — they go through GlobalExceptionFilter.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const requestId = req.headers[REQUEST_ID_HEADER] as string;

    return next.handle().pipe(
      map(
        (data: T): ApiResponse<T> => ({
          success: true,
          statusCode: res.statusCode,
          data,
          timestamp: new Date().toISOString(),
          requestId,
        }),
      ),
    );
  }
}
