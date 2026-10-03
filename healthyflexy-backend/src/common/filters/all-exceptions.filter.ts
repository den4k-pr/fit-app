import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-codes';

const KNOWN_CODES = new Set<string>(Object.values(ErrorCode));

/** HTTP-статус без власного code → найближчий машиночитний код */
const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN_ROLE,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
};

/** "phone must be..." → { phone: ["phone must be..."] } */
function groupValidationMessages(messages: string[]): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const message of messages) {
    const field = message.split(' ')[0].replace(/\[.*$/, '') || 'body';
    (details[field] ??= []).push(message);
  }
  return details;
}

/**
 * Глобальний фільтр: будь-яка помилка → ErrorResponseDto
 * { statusCode, code, message, details?, timestamp, path }. Клієнту тексти не показуються, лише `code`.
 * Невідомі помилки → 500 INTERNAL_ERROR (стек лише в логу, разом із requestId).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const response = http.getResponse<Response>();

    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = ErrorCode.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
      if (typeof payload.code === 'string' && KNOWN_CODES.has(payload.code)) {
        code = payload.code as ErrorCode;
        message = typeof payload.message === 'string' ? payload.message : code;
      } else if (Array.isArray(payload.message)) {
        code = ErrorCode.VALIDATION_FAILED;
        message = 'Validation failed';
        details = groupValidationMessages(payload.message as string[]);
      } else {
        code = STATUS_TO_CODE[statusCode] ?? ErrorCode.INTERNAL_ERROR;
        message = typeof payload.message === 'string' ? payload.message : exception.message;
      }
    }

    if (statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode} [${request.id ?? '-'}]`,
        stack,
      );
    }

    response.locals.errorCode = code;
    response.status(statusCode).json({
      statusCode,
      code,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
