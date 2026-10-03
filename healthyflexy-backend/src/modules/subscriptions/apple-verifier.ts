import { Environment, SignedDataVerifier } from '@apple/app-store-server-library';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EnvironmentVariables } from '../../config';
import { ConfigService } from '@nestjs/config';

/**
 * Перевірка підписаних даних App Store (StoreKit 2 транзакції, App Store Server Notifications V2) офіційною
 * бібліотекою Apple: ланцюжок сертифікатів x5c до кореневих сертифікатів Apple, bundle ID, оточення.
 * Кореневі сертифікати (AppleRootCA-G3.cer тощо) завантажуються з apple.com/certificateauthority у APPLE_ROOT_CERTS_DIR.
 * Без APPLE_BUNDLE_ID або сертифікатів — null (перевірку покупок App Store вимкнено).
 */
export function createAppleVerifier(
  config: ConfigService<EnvironmentVariables, true>,
): SignedDataVerifier | null {
  const bundleId = config.get('APPLE_BUNDLE_ID', { infer: true });
  const dir = config.get('APPLE_ROOT_CERTS_DIR', { infer: true });
  if (!bundleId || !dir) return null;
  const certs = readdirSync(dir)
    .filter((f) => /\.(cer|der|crt)$/i.test(f))
    .map((f) => readFileSync(join(dir, f)));
  if (certs.length === 0) return null;
  const environment =
    config.get('APPLE_IAP_ENVIRONMENT', { infer: true }) === 'Production'
      ? Environment.PRODUCTION
      : Environment.SANDBOX;
  return new SignedDataVerifier(
    certs,
    true, // онлайн-перевірка відкликання сертифікатів (OCSP)
    environment,
    bundleId,
    environment === Environment.PRODUCTION
      ? config.get('APPLE_APP_ID', { infer: true })
      : undefined,
  );
}
