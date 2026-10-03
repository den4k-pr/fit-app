import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { EnvironmentVariables } from '../../config';

/** DI-токен клієнта Stripe (у тестах підміняється фейком; без ключа — null, оплати вимкнено) */
export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export type StripeClient = Stripe;

/** Версія API фіксується разом із версією SDK (stripe@23) — зміни API не приходять «самі» */
export const STRIPE_API_VERSION = '2026-09-30.endive' as const;

export function createStripeClient(
  config: ConfigService<EnvironmentVariables, true>,
): Stripe | null {
  const key = config.get('STRIPE_SECRET_KEY', { infer: true });
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: 'healthyflexy-backend' },
  });
}

/** Сума в найменших одиницях валюти (EUR/PLN — центи/гроші) — Stripe приймає лише цілі */
export const toMinor = (amount: number): number => Math.round(amount * 100);
export const fromMinor = (minor: number): number => Math.round(minor) / 100;
