import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Stamps every incoming request with a UUID.
 * Respects upstream IDs (load balancer, CDN) when already present.
 * The ID is propagated on the response header and read by all interceptors.
 *
 * Must be the FIRST middleware in the chain.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req.headers[REQUEST_ID_HEADER] as string) ?? randomUUID();

    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
