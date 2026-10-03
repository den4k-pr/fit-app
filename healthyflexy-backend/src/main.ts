import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { AppLogger } from './common/logging/app-logger';
import { EnvironmentVariables } from './config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // сире тіло запиту — для перевірки підпису вебхуків Stripe
    rawBody: true,
  });
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  app.useLogger(new AppLogger(config.get('LOG_FORMAT', { infer: true })));
  const logger = new Logger('Bootstrap');

  configureApp(app);

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Healthyflexy API')
        .setDescription('Книжка турботи: REST + WebSocket (/realtime)')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  // Keep-alive довший за простій з'єднання на проксі Railway (60 с): інакше Node (типово 5 с) закриває
  // з'єднання, яке проксі ще вважає живим, і наступний запит застосунку отримує 502 / чекає нове TCP+TLS
  const server = app.getHttpServer();
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  logger.log(
    `API listening on :${port} (${config.get('NODE_ENV', { infer: true })}), storage=${config.get('STORAGE_DRIVER', { infer: true })}`,
  );
}

void bootstrap();
