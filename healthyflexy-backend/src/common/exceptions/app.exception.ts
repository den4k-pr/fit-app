import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

/**
 * Бізнес-помилка з машиночитним кодом:
 *   throw new AppException(ErrorCode.INVITE_EXPIRED, HttpStatus.GONE, 'Invite expired');
 * AllExceptionsFilter віддасть її у форматі ErrorResponseDto.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    status: HttpStatus,
    message?: string,
  ) {
    super({ code, message: message ?? code }, status);
  }
}
