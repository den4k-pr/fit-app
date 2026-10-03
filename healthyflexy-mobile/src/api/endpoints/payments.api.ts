import { apiClient } from '../client';
import type { AutoTopup, FundDepositStatus, FundIntent, PaymentsConfig, PayoutStatus, SetupIntent, TopupInterval } from '@/types';

/** Реальні гроші через Stripe: поповнення фонду (спонсор), автопоповнення, виплати (батько/мати) */
export const paymentsApi = {
  getConfig: () => apiClient.get<PaymentsConfig>('/payments/config').then((r) => r.data),
  createFundIntent: (amount: number) => apiClient.post<FundIntent>('/payments/fund/intent', { amount }).then((r) => r.data),
  getFundStatus: (paymentIntentId: string) =>
    apiClient.get<{ status: FundDepositStatus; amount: number }>(`/payments/fund/intent/${paymentIntentId}`).then((r) => r.data),
  createSetupIntent: () => apiClient.post<SetupIntent>('/payments/auto-topup/setup-intent').then((r) => r.data),
  getAutoTopup: () => apiClient.get<AutoTopup>('/payments/auto-topup').then((r) => r.data),
  saveAutoTopup: (body: { amount: number; interval: TopupInterval; active: boolean }) =>
    apiClient.put<AutoTopup>('/payments/auto-topup', body).then((r) => r.data),
  getPayoutStatus: () => apiClient.get<PayoutStatus>('/payments/payouts/status').then((r) => r.data),
  createPayoutOnboarding: () => apiClient.post<{ url: string }>('/payments/payouts/onboarding', {}).then((r) => r.data),
  createPayoutDashboard: () => apiClient.post<{ url: string }>('/payments/payouts/dashboard').then((r) => r.data),
  withdraw: (amount: number) =>
    apiClient.post<{ ledgerId: string; amount: number; status: string }>('/payments/payouts/withdraw', { amount }).then((r) => r.data),
};
