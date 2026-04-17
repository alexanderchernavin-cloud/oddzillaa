import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import type { RequestWithId } from './request-id.middleware';

interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Partial<RequestWithId>>();
    const requestId = req.requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'internal_error';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'validation_error';
      message = 'Invalid request body';
      details = exception.issues;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as { message?: string | string[]; error?: string; code?: string };
        message = Array.isArray(b.message) ? b.message.join('; ') : b.message ?? message;
        code = b.code ?? (b.error ? String(b.error).toLowerCase().replace(/\s+/g, '_') : code);
      }
      if (code === 'internal_error') code = httpStatusCode(status);
    } else if (exception instanceof Error) {
      this.logger.error({ msg: exception.message, stack: exception.stack, requestId });
    }

    const payload: ApiErrorPayload = {
      error: { code, message, requestId, details },
    };
    res.status(status).json(payload);
  }
}

function httpStatusCode(status: number): string {
  switch (status) {
    case 400:
      return 'bad_request';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 422:
      return 'unprocessable_entity';
    case 429:
      return 'too_many_requests';
    case 501:
      return 'not_implemented';
    default:
      return 'error';
  }
}
