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

  // ── Resolution ────────────────────────────────────────────────────────────

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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private fromHttpException(
    exception: HttpException,
    request: Request,
  ): { status: number; body: ApiResponse } {
    const status = exception.getStatus();
    const raw = exception.getResponse() as string | NestHttpExceptionResponse;

    if (typeof raw === 'object' && Array.isArray(raw.message)) {
      const errors: ValidationErrorDetail[] = (raw.message as string[]).map(
        (msg) => ({ field: msg.split(' ')[0] ?? 'unknown', messages: [msg] }),
      );
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
        : typeof raw.message === 'string'
          ? raw.message
          : exception.message;

    return {
      status,
      body: this.envelope(
        status,
        raw instanceof Object ? (raw.error ?? 'ERROR') : 'ERROR',
        message,
        request,
      ),
    };
  }

  private fromMongooseValidation(
    exception: MongooseError.ValidationError,
    request: Request,
  ): { status: number; body: ApiResponse } {
    const errors: ValidationErrorDetail[] = Object.values(exception.errors).map(
      (e) => ({ field: e.path, messages: [e.message] }),
    );

    return {
      status: HttpStatus.BAD_REQUEST,
      body: {
        ...this.envelope(
          HttpStatus.BAD_REQUEST,
          'VALIDATION_ERROR',
          'Validation failed',
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
      return {
        status: HttpStatus.CONFLICT,
        body: this.envelope(
          HttpStatus.CONFLICT,
          'CONFLICT',
          'A record with this value already exists',
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
}
