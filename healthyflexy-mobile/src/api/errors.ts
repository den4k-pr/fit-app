import axios from 'axios';
import { ErrorCode, type ApiErrorBody } from '@/types';

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'UNKNOWN';

/** Єдиний тип помилки для всього застосунку. Текст показуємо через t(`errors.${error.code}`). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

/** Нормалізує будь-яку помилку (axios / мережа / невідома) в ApiError. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;
    if (body?.code) return new ApiError(body.statusCode, body.code, body.message, body.details);
    if (!error.response) return new ApiError(0, 'NETWORK_ERROR', error.message);
    return new ApiError(error.response.status, ErrorCode.InternalError, error.message);
  }
  return new ApiError(0, 'UNKNOWN', error instanceof Error ? error.message : String(error));
}
