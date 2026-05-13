import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware';

interface ErrorBody {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId: string;
}

/**
 * Unified error envelope — identical shape to auth-service GlobalExceptionFilter.
 * Handles:
 *   - NestJS HttpException (all subclasses)
 *   - MongoDB E11000 duplicate key → 409
 *   - Mongoose ValidationError → 422
 *   - Mongoose CastError (bad ObjectId) → 400
 *   - Everything else → 500 (details hidden in production)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = req.headers[REQUEST_ID_HEADER] as string;
    const path = req.url;
    const timestamp = new Date().toISOString();

    const { status, error, message } = this.resolve(exception);

    if (status >= 500) {
      this.logger.error(
        `[${req.method}] ${path} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${req.method}] ${path} → ${status} : ${String(message)}`,
      );
    }

    const body: ErrorBody = {
      success: false,
      statusCode: status,
      error,
      message,
      timestamp,
      path,
      requestId,
    };

    res.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    error: string;
    message: string | string[];
  } {
    // NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse() as
        | string
        | { message: string | string[]; error?: string };

      if (typeof raw === 'string') {
        return { status, error: this.codeFor(status), message: raw };
      }
      return {
        status,
        error: raw.error ?? this.codeFor(status),
        message: raw.message ?? exception.message,
      };
    }

    // MongoDB duplicate key
    if (exception instanceof MongoServerError && exception.code === 11000) {
      const field =
        Object.keys(
          (
            exception as MongoServerError & {
              keyValue?: Record<string, unknown>;
            }
          ).keyValue ?? {},
        )[0] ?? 'field';
      return {
        status: HttpStatus.CONFLICT,
        error: 'CONFLICT',
        message: `A record with this ${field} already exists`,
      };
    }

    // Mongoose validation
    if (exception instanceof MongooseError.ValidationError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'UNPROCESSABLE_ENTITY',
        message: Object.values(exception.errors).map((e) => e.message),
      };
    }

    // Mongoose cast (bad ObjectId in URL)
    if (exception instanceof MongooseError.CastError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'BAD_REQUEST',
        message: `Invalid value for '${exception.path}'`,
      };
    }

    // Unknown — hide details in production
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_SERVER_ERROR',
      message:
        process.env['NODE_ENV'] !== 'production' && exception instanceof Error
          ? exception.message
          : 'An unexpected error occurred',
    };
  }

  private codeFor(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      408: 'REQUEST_TIMEOUT',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? `HTTP_${status}`;
  }
}
