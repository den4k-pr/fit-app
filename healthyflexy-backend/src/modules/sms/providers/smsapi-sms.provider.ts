import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../../config';
import { SmsProvider, SmsSendResult } from '../sms-provider.interface';

const TIMEOUT_MS = 10_000;

interface SmsapiResponse {
  count?: number;
  list?: { id?: string; status?: string; points?: number }[];
  error?: number;
  message?: string;
}

/**
 * SMSAPI.com (Польща, ЄС): найдешевші SMS для Польщі (~€0.036) та України (~€0.146), без абонплати.
 * Один POST `/sms.do` з Bearer-токеном (без SDK). Номер — цифрами без «+». Помилка SMSAPI приходить як
 * `{ error: <код>, message }` (іноді з HTTP 200) — кидаємо її далі, SmsService запише причину й підказку в лог.
 */
@Injectable()
export class SmsapiSmsProvider implements SmsProvider {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  async send(to: string, body: string): Promise<SmsSendResult> {
    const token = this.config.get('SMSAPI_TOKEN', { infer: true });
    if (!token)
      throw Object.assign(new Error('SMSAPI_TOKEN is not set'), { code: 'not_configured' });
    const sender = this.config.get('SMSAPI_SENDER', { infer: true })?.trim();
    const form = new URLSearchParams({
      to: to.replace(/^\+/, ''),
      message: body,
      format: 'json',
      encoding: 'utf-8',
      ...(sender ? { from: sender } : {}),
    });
    const base = this.config.get('SMSAPI_URL', { infer: true }).replace(/\/$/, '');
    const response = await fetch(`${base}/sms.do`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = (await response.json().catch(() => ({}))) as SmsapiResponse;
    if (!response.ok || data.error) {
      throw Object.assign(new Error(data.message ?? `SMSAPI HTTP ${response.status}`), {
        code: data.error !== undefined ? `smsapi_${data.error}` : undefined,
        status: response.status,
      });
    }
    const first = data.list?.[0];
    return { id: first?.id, status: first?.status };
  }
}
