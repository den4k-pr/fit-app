import { ErrorCode } from '../constants/error-codes';

/** Єдиний формат помилки для всіх ендпоінтів (див. AllExceptionsFilter). */
export class ErrorResponseDto {
  statusCode: number;

  /** Машиночитний код — клієнт перекладає його у зрозумілий текст */
  code: ErrorCode;

  /** Технічне повідомлення (для логів/розробника, НЕ для показу користувачу) */
  message: string;

  /** Деталі валідації: поле → список порушень */
  details?: Record<string, string[]>;

  /** ISO-час помилки */
  timestamp: string;

  path: string;
}
