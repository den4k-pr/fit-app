import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { parseFamilyHeader, requestContext } from './common/context/request-context';
import { requestLogger } from './common/logging/request-logger.middleware';
import { EnvironmentVariables } from './config';

/** Спільне налаштування застосунку для main.ts і e2e-тестів: тест перевіряє РІВНО те, що працює в продакшні */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  // Railway стоїть за проксі: потрібно для коректного req.ip (rate limit OTP)
  if (config.get('TRUST_PROXY', { infer: true })) app.set('trust proxy', 1);

  // Кожному запиту — id (з заголовка клієнта або новий): зв'язує лог запиту, помилку та відповідь клієнту
  app.use((req: Request & { id?: string }, res: Response, next: NextFunction) => {
    req.id = req.header('x-request-id') ?? randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });

  app.use(requestLogger());

  // Дитина з кількома батьками: обрана сім'я (X-Family-Id) доступна сервісам через AsyncLocalStorage
  app.use((req: Request, _res: Response, next: NextFunction) => {
    requestContext.run({ familyId: parseFamilyHeader(req.header('x-family-id')) }, next);
  });

  app.use(helmet());

  // gzip відповідей від 1 КБ: «Сьогодні», каталоги вправ/програм і ledger — у 4–8 разів менше байтів
  // мобільною мережею (Railway edge сам JSON не стискає)
  app.use(compression({ threshold: 1024 }));

  // CORS потрібен лише браузерним клієнтам: сайту CRM (ADMIN_CORS_ORIGINS) і, за потреби, іншим (CORS_ORIGINS)
  const corsOrigins = [
    config.get('CORS_ORIGINS', { infer: true }),
    config.get('ADMIN_CORS_ORIGINS', { infer: true }),
  ]
    .filter((v): v is string => !!v)
    .flatMap((v) => v.split(','))
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (corsOrigins.length > 0) app.enableCors({ origin: corsOrigins, maxAge: 600 });

  // /health лишається без префікса: під нього налаштований healthcheck Railway
  app.setGlobalPrefix(config.get('API_GLOBAL_PREFIX', { infer: true }), { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
}
