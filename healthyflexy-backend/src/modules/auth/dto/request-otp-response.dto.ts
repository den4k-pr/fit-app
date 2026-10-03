export class RequestOtpResponseDto {
  /** Через скільки секунд можна запросити код повторно */
  retryAfterSeconds: number;

  /** Скільки секунд код дійсний */
  expiresInSeconds: number;
}
