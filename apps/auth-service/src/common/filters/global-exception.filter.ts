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
import { ApiResponse, ValidationErrorDetail } from '../types/index';

interface NestHttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.resolve(exception, request);

    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} → ${status} : ${body.message}`,
      );
    }

    response.status(status).json(body);
  }

  // ── Resolution ───────────────────────────────────────────────────────────────

  private resolve(
    exception: unknown,
    request: Request,
  ): { status: number; body: ApiResponse } {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception, request);
    }
    if (exception instanceof MongooseError.ValidationError) {
      return this.fromMongooseValidation(exception, request);
    }
    if (exception instanceof MongooseError.CastError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: this.envelope(
          HttpStatus.BAD_REQUEST,
          'BAD_REQUEST',
          `Invalid value for field "${exception.path}": ${String(exception.value)}`,
          request,
        ),
      };
    }
    if (exception instanceof MongoServerError) {
      return this.fromMongoServerError(exception, request);
    }
    if (exception instanceof Error) {
      this.logger.error('Unhandled exception', exception.stack);
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: this.envelope(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'INTERNAL_SERVER_ERROR',
          'An unexpected error occurred',
          request,
        ),
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: this.envelope(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'INTERNAL_SERVER_ERROR',
        'An unexpected error occurred',
        request,
      ),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private fromHttpException(
    exception: HttpException,
    request: Request,
  ): { status: number; body: ApiResponse } {
    const status = exception.getStatus();
    const raw = exception.getResponse() as string | NestHttpExceptionResponse;

    if (typeof raw === 'object' && Array.isArray(raw.message)) {
      const errors: ValidationErrorDetail[] = raw.message.map((msg) => ({
        field: msg.split(' ')[0] ?? 'unknown',
        messages: [msg],
      }));
      return {
        status,
        body: {
          ...this.envelope(
            status,
            raw.error ?? 'VALIDATION_ERROR',
            'Validation failed',
            request,
          ),
          errors,
        },
      };
    }

    const message =
      typeof raw === 'string'
        ? raw
        : ((raw.message as string | undefined) ?? exception.message);

    const error =
      typeof raw === 'object'
        ? (raw.error ?? this.codeFromStatus(status))
        : this.codeFromStatus(status);

    return { status, body: this.envelope(status, error, message, request) };
  }

  private fromMongooseValidation(
    exception: MongooseError.ValidationError,
    request: Request,
  ): { status: number; body: ApiResponse } {
    const errors: ValidationErrorDetail[] = Object.entries(
      exception.errors,
    ).map(([field, err]) => ({ field, messages: [err.message] }));
    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      body: {
        ...this.envelope(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'VALIDATION_ERROR',
          'Schema validation failed',
          request,
        ),
        errors,
      },
    };
  }

  private fromMongoServerError(
    exception: MongoServerError,
    request: Request,
  ): { status: number; body: ApiResponse } {
    if (exception.code === 11000) {
      const match = exception.message.match(/index: (\w+)_/);
      const field = match?.[1] ?? 'field';
      return {
        status: HttpStatus.CONFLICT,
        body: this.envelope(
          HttpStatus.CONFLICT,
          'DUPLICATE_KEY',
          `A record with that ${field} already exists`,
          request,
        ),
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: this.envelope(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'DATABASE_ERROR',
        'A database error occurred',
        request,
      ),
    };
  }

  private envelope(
    statusCode: number,
    error: string,
    message: string,
    request: Request,
  ): ApiResponse {
    return {
      success: false,
      statusCode,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? 'ERROR';
  }
}
