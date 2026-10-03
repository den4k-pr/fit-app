import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSign } from 'node:crypto';
import { EnvironmentVariables } from '../../config';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/** Відповідь purchases.subscriptionsv2.get (поля, які використовуємо) */
export interface PlaySubscriptionV2 {
  subscriptionState?: string;
  acknowledgementState?: string;
  linkedPurchaseToken?: string;
  testPurchase?: Record<string, never>;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  lineItems?: {
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
  }[];
}

/**
 * Google Play Developer API без важкого SDK: OAuth-токен сервісного акаунта (JWT RS256 → oauth2 token),
 * `purchases.subscriptionsv2.get` і `purchases.subscriptions.acknowledge` (без підтвердження за 3 дні
 * Google автоматично повертає гроші за підписку).
 */
@Injectable()
export class GooglePlayClient {
  private readonly logger = new Logger(GooglePlayClient.name);
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  get packageName(): string | undefined {
    return this.config.get('GOOGLE_PLAY_PACKAGE_NAME', { infer: true });
  }

  get enabled(): boolean {
    return (
      !!this.packageName && !!this.config.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', { infer: true })
    );
  }

  async getSubscription(purchaseToken: string): Promise<PlaySubscriptionV2> {
    const url = `${API}/${this.packageName}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    return (await this.request(url, 'GET')) as PlaySubscriptionV2;
  }

  async acknowledge(productId: string, purchaseToken: string): Promise<void> {
    const url = `${API}/${this.packageName}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
    await this.request(url, 'POST', {});
  }

  private async request(url: string, method: 'GET' | 'POST', body?: unknown): Promise<unknown> {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${await this.accessToken()}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    if (!response.ok) {
      this.logger.warn({
        event: 'google_play_api_error',
        status: response.status,
        body: text.slice(0, 300),
      });
      throw Object.assign(new Error(`Google Play API ${response.status}`), {
        status: response.status,
      });
    }
    return text ? JSON.parse(text) : {};
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt - Date.now() > 60_000) return this.token.value;
    const account = JSON.parse(
      this.config.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', { infer: true }) ?? '{}',
    ) as ServiceAccount;
    const now = Math.floor(Date.now() / 1000);
    const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
    const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })}`;
    const signature = createSign('RSA-SHA256')
      .update(unsigned)
      .sign(account.private_key, 'base64url');
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${signature}`,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!response.ok || !data.access_token) throw new Error('Google OAuth token request failed');
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return this.token.value;
  }
}
