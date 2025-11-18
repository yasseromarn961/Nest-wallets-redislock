import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare module 'http' {
  interface IncomingMessage {
    requestId?: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const headerVal =
      req.headers['x-request-id'] ?? req.headers['x-correlation-id'];
    const existingId = Array.isArray(headerVal) ? headerVal[0] : headerVal;
    const requestId = existingId || randomUUID();

    // attach to request and response
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
