/* eslint-disable @typescript-eslint/require-await -- фейкові методи Stripe повертають Promise, як справжній SDK */
import Stripe from 'stripe';
import { vi } from 'vitest';

/**
 * Фейковий клієнт Stripe для e2e: справжні `webhooks` (підпис / розбір подій — офлайн), а мережеві ресурси —
 * vi.fn() з правдоподібними відповідями. Тест сам керує відповідями (напр. відмова Transfer).
 */
export function createFakeStripe() {
  const real = new Stripe('sk_test_fake_e2e');
  let seq = 0;
  const id = (prefix: string) => `${prefix}_${++seq}`;
  const fake = {
    webhooks: real.webhooks,
    customers: { create: vi.fn(async () => ({ id: id('cus') })) },
    ephemeralKeys: { create: vi.fn(async () => ({ secret: 'ek_test_secret' })) },
    paymentIntents: {
      create: vi.fn(async (params: Stripe.PaymentIntentCreateParams) => ({
        id: id('pi'),
        object: 'payment_intent',
        client_secret: 'pi_secret',
        amount: params.amount,
        amount_received: params.confirm ? params.amount : 0,
        currency: params.currency,
        metadata: params.metadata,
        status: params.confirm ? 'succeeded' : 'requires_payment_method',
        payment_method: params.payment_method ?? null,
        payment_method_types: ['card'],
        last_payment_error: null,
      })),
      retrieve: vi.fn(),
    },
    setupIntents: { create: vi.fn(async () => ({ id: id('seti'), client_secret: 'seti_secret' })) },
    paymentMethods: {
      retrieve: vi.fn(async (pm: string) => ({
        id: pm,
        type: 'card',
        card: { brand: 'visa', last4: '4242', wallet: null },
      })),
    },
    accounts: {
      create: vi.fn(async () => ({
        id: id('acct'),
        payouts_enabled: false,
        details_submitted: false,
      })),
      retrieve: vi.fn(async (acct: string) => ({
        id: acct,
        payouts_enabled: false,
        details_submitted: false,
      })),
      createLoginLink: vi.fn(async () => ({ url: 'https://connect.stripe.com/express/login' })),
    },
    accountLinks: { create: vi.fn(async () => ({ url: 'https://connect.stripe.com/setup/e2e' })) },
    transfers: { create: vi.fn(async () => ({ id: id('tr') })) },
  };
  return fake;
}

/** Підписана подія вебхука (як від Stripe) */
export function signedEvent(type: string, object: object, secret: string) {
  const payload = JSON.stringify({
    id: `evt_${Math.random().toString(36).slice(2)}`,
    object: 'event',
    type,
    api_version: '2026-09-30.endive',
    created: Math.floor(Date.now() / 1000),
    data: { object },
  });
  const header = new Stripe('sk_test_fake_e2e').webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  return { payload, header };
}
