import { Logger } from '@nestjs/common';
import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * 404, які клієнт очікує й обробляє сам: «на цю дату немає запису дня», «сім'ї ще немає».
 * Пишемо їх звичайним рівнем, щоб не засмічувати WARN (на кожному відкритті дашборда таких 7).
 */
const EXPECTED_NOT_FOUND = [/\/workouts\/days\/\d{4}-\d{2}-\d{2}$/, /\/families\/current$/];

interface LoggedRequest extends Request {
  id?: string;
  user?: { id: string };
}

/**
 * Лог КОЖНОГО HTTP-запиту, у тому числі відхилених ще до контролера (401/403/429, невірний маршрут).
 * Guard'и працюють раніше за interceptor'и, тому логувати треба на рівні middleware.
 * Пишемо: метод, шлях (без query: там підписи), статус, тривалість, userId, requestId і КОД помилки
 * (його виставляє AllExceptionsFilter). Тіла запитів не логуються: там телефони, суми, коди.
 */
export function requestLogger(): RequestHandler {
  const logger = new Logger('Http');
  return (req: LoggedRequest, res: Response, next: NextFunction) => {
    const started = Date.now();
    const base = () => ({
      event: 'http',
      method: req.method,
      path: req.originalUrl.split('?')[0],
      ms: Date.now() - started,
      userId: req.user?.id ?? null,
      requestId: req.id ?? null,
    });

    res.on('finish', () => {
      const status = res.statusCode;
      const code = (res.locals as { errorCode?: string }).errorCode;
      const entry = { ...base(), status, ...(code ? { code } : {}) };
      if (status >= 500) logger.error(entry);
      else if (status === 404 && EXPECTED_NOT_FOUND.some((re) => re.test(entry.path)))
        logger.log(entry);
      else if (status >= 400) logger.warn(entry);
      else if (req.originalUrl !== '/health') logger.log(entry);
    });
    // клієнт розірвав з'єднання до відповіді (обрив мережі, таймаут на телефоні)
    res.on('close', () => {
      if (!res.writableEnded) logger.warn({ ...base(), status: 0, code: 'CLIENT_ABORTED' });
    });
    next();
  };
}
