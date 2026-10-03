import { isProduction } from '@/config/env';
import type { PaymentsConfig } from '@/types';

type StripeModule = typeof import('@stripe/stripe-react-native');

/**
 * Stripe PaymentSheet: картка, Apple Pay, Google Pay, BLIK (у злотих), PayPal — який спосіб показати, вирішує
 * Stripe за налаштуваннями Dashboard і валютою. Дані картки йдуть напряму в Stripe (застосунок і сервер їх не бачать).
 * Нативний модуль підвантажується ліниво: стара збірка без Stripe (OTA-оновлення) не падає, а показує облікове поповнення.
 */
let cached: StripeModule | null | undefined;
function stripeModule(): StripeModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('@stripe/stripe-react-native') as StripeModule;
  } catch {
    cached = null;
  }
  return cached;
}

export const isStripeAvailable = (): boolean => stripeModule() !== null;

/** Поверніть з BLIK/PayPal/3-D Secure назад у застосунок */
const RETURN_URL = 'healthyflexy://stripe-redirect';
const APPLE_MERCHANT_ID = process.env.EXPO_PUBLIC_STRIPE_APPLE_MERCHANT_ID || 'merchant.com.healthyflexy.app';

export type SheetResult = { status: 'completed' } | { status: 'canceled' } | { status: 'failed'; message: string };

export interface SheetParams {
  config: PaymentsConfig;
  customerId: string;
  ephemeralKey: string;
  currency: string;
  /** Оплата (PaymentIntent) або збереження картки для автопоповнення (SetupIntent) */
  paymentIntentClientSecret?: string;
  setupIntentClientSecret?: string;
}

export async function presentStripeSheet(params: SheetParams): Promise<SheetResult> {
  const stripe = stripeModule();
  if (!stripe || !params.config.publishableKey) return { status: 'failed', message: 'stripe_unavailable' };
  await stripe.initStripe({
    publishableKey: params.config.publishableKey,
    merchantIdentifier: APPLE_MERCHANT_ID,
    urlScheme: 'healthyflexy',
  });
  const common = {
    merchantDisplayName: params.config.merchantName,
    customerId: params.customerId,
    customerEphemeralKeySecret: params.ephemeralKey,
    returnURL: RETURN_URL,
    // BLIK, PayPal підтверджуються не миттєво — PaymentSheet має їх показувати
    allowsDelayedPaymentMethods: true,
    applePay: { merchantCountryCode: params.config.merchantCountry },
    googlePay: {
      merchantCountryCode: params.config.merchantCountry,
      currencyCode: params.currency.toUpperCase(),
      testEnv: !isProduction,
    },
  };
  const init = params.setupIntentClientSecret
    ? await stripe.initPaymentSheet({ ...common, setupIntentClientSecret: params.setupIntentClientSecret })
    : await stripe.initPaymentSheet({ ...common, paymentIntentClientSecret: params.paymentIntentClientSecret as string });
  if (init.error) return { status: 'failed', message: init.error.localizedMessage ?? init.error.message };
  const result = await stripe.presentPaymentSheet();
  if (!result.error) return { status: 'completed' };
  if (result.error.code === stripe.PaymentSheetError.Canceled) return { status: 'canceled' };
  return { status: 'failed', message: result.error.localizedMessage ?? result.error.message };
}
