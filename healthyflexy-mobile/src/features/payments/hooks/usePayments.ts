import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { api } from '@/api/gateway';
import { toApiError, type ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import i18n from '@/i18n';
import { isStripeAvailable, presentStripeSheet } from '@/services/payments/stripe-sheet';
import { showToast } from '@/store/ui.store';
import type { AutoTopup, TopupInterval } from '@/types';

/** Чи можна платити через Stripe на цьому пристрої: ключ на сервері + нативний модуль у збірці */
export function usePaymentsConfig() {
  const query = useQuery({ queryKey: queryKeys.payments.config(), queryFn: () => api.payments.getConfig(), staleTime: 10 * 60_000 });
  return { ...query, canPay: !!query.data?.enabled && !!query.data.publishableKey && isStripeAvailable() };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Поповнення фонду через Stripe: PaymentIntent на сервері → PaymentSheet (картка / Apple Pay / Google Pay / BLIK /
 * PayPal) → сервер підтверджує оплату (вебхук або перевірка в Stripe). Фонд оновлюється лише за статусом сервера.
 */
export function useStripeTopup() {
  const queryClient = useQueryClient();
  const config = usePaymentsConfig();
  return useMutation<'succeeded' | 'pending' | 'canceled', ApiError, number>({
    mutationFn: async (amount) => {
      if (!config.data) throw toApiError(new Error('config'));
      const intent = await api.payments.createFundIntent(amount);
      const sheet = await presentStripeSheet({
        config: config.data,
        customerId: intent.customerId,
        ephemeralKey: intent.ephemeralKey,
        currency: intent.currency,
        paymentIntentClientSecret: intent.clientSecret,
      });
      if (sheet.status === 'canceled') return 'canceled';
      if (sheet.status === 'failed') {
        showToast(sheet.message);
        return 'canceled';
      }
      // BLIK / PayPal можуть підтвердитися за кілька секунд — недовго чекаємо статус сервера
      for (let i = 0; i < 6; i += 1) {
        const status = await api.payments.getFundStatus(intent.paymentIntentId);
        if (status.status === 'succeeded') return 'succeeded';
        if (status.status === 'failed' || status.status === 'canceled') throw toApiError(new Error('PAYMENT_FAILED'));
        await wait(1500);
      }
      return 'pending';
    },
    onSuccess: (result) => {
      if (result === 'canceled') return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.family.all });
      showToast(i18n.t(result === 'succeeded' ? 'payments.topup.succeeded' : 'payments.topup.pending'));
    },
    onError: () => showToast(i18n.t('errors.PAYMENT_FAILED')),
  });
}

export function useAutoTopup() {
  const queryClient = useQueryClient();
  const config = usePaymentsConfig();
  const query = useQuery({ queryKey: queryKeys.payments.autoTopup(), queryFn: () => api.payments.getAutoTopup(), enabled: !!config.data?.enabled });
  const save = useMutation<AutoTopup, ApiError, { amount: number; interval: TopupInterval; active: boolean }>({
    mutationFn: (body) => api.payments.saveAutoTopup(body),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.payments.autoTopup(), data);
      showToast(i18n.t(data.active ? 'payments.auto.saved' : 'payments.auto.disabled'));
    },
    onError: (error) => showToast(i18n.t(`errors.${error.code}`)),
  });
  /** Зберегти картку для автосписань (PaymentSheet у режимі setup) */
  const saveCard = useMutation<boolean, ApiError, void>({
    mutationFn: async () => {
      if (!config.data) return false;
      const intent = await api.payments.createSetupIntent();
      const sheet = await presentStripeSheet({
        config: config.data,
        customerId: intent.customerId,
        ephemeralKey: intent.ephemeralKey,
        currency: 'EUR',
        setupIntentClientSecret: intent.clientSecret,
      });
      if (sheet.status === 'failed') showToast(sheet.message);
      if (sheet.status !== 'completed') return false;
      // картку сервер зберігає за вебхуком — даємо йому мить і перечитуємо
      await wait(1500);
      await queryClient.invalidateQueries({ queryKey: queryKeys.payments.autoTopup() });
      return true;
    },
    onError: (error) => showToast(i18n.t(`errors.${error.code}`)),
  });
  return { query, save, saveCard };
}

export function usePayouts() {
  const queryClient = useQueryClient();
  const config = usePaymentsConfig();
  const status = useQuery({ queryKey: queryKeys.payments.payouts(), queryFn: () => api.payments.getPayoutStatus(), enabled: !!config.data?.enabled });
  /** Налаштування виплат у Stripe (особа й рахунок/картка) у браузері; повернення — deep link у застосунок */
  const onboard = useMutation<void, ApiError, void>({
    mutationFn: async () => {
      const { url } = await api.payments.createPayoutOnboarding();
      await WebBrowser.openAuthSessionAsync(url, 'healthyflexy://payouts');
      await queryClient.invalidateQueries({ queryKey: queryKeys.payments.payouts() });
    },
    onError: (error) => showToast(i18n.t(`errors.${error.code}`)),
  });
  const dashboard = useMutation<void, ApiError, void>({
    mutationFn: async () => {
      const { url } = await api.payments.createPayoutDashboard();
      await WebBrowser.openBrowserAsync(url);
    },
    onError: (error) => showToast(i18n.t(`errors.${error.code}`)),
  });
  const withdraw = useMutation<unknown, ApiError, number>({
    mutationFn: (amount) => api.payments.withdraw(amount),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.payouts() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.family.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ledger.all });
      showToast(i18n.t('payments.payout.done'));
    },
    onError: (error) => showToast(i18n.t(`errors.${error.code}`)),
  });
  return { config, status, onboard, dashboard, withdraw };
}
