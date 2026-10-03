import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER } from '../../common/constants';
import { AppConfigService, StorageDriver } from '../../config';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

/**
 * Вибір сховища за `STORAGE_DRIVER` (local | s3). Решта коду залежить лише від StorageService / порту StorageProvider.
 */
@Module({
  controllers: [StorageController],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: AppConfigService) =>
        config.get('STORAGE_DRIVER', { infer: true }) === StorageDriver.S3
          ? new S3StorageProvider(config)
          : new LocalStorageProvider(config),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
