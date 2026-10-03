import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ASYNC_KEYS } from '@/constants/storage-keys';
import type { ISODateTime, UpdatePlanRequest } from '@/types';

/**
 * Стан «до входу»: consent-екран іде ПЕРЕД реєстрацією (розділ 5.2 ТЗ), тому згоду спершу
 * запам'ятовуємо локально, а після входу відправляємо POST /users/me/consent.
 */
interface OnboardingState {
  hydrated: boolean;
  /** Мову застосунку вже обрано на першому екрані (показується один раз, до згод) */
  languageChosen: boolean;
  onboardingSeen: boolean;
  /** Коли користувач поставив 3 галочки на consent-екрані (ще не відправлено на сервер) */
  consentAcceptedAt: ISODateTime | null;
  /** Код із deep link healthyflexy://join/CODE, відкритий до входу */
  pendingInviteCode: string | null;
  /** Дитина вже пройшла крок «перший план» (або пропустила його) */
  firstPlanDone: boolean;
  /** План із кроку «перший план»: застосовується автоматично, щойно батько/мати приєднається й з'явиться сім'я */
  pendingPlan: UpdatePlanRequest | null;
  /** Гайд «Як користуватися» вже показано цій ролі на цьому пристрої (автопоказ — лише раз) */
  guideSeen: Partial<Record<'parent' | 'child', boolean>>;

  markLanguageChosen: () => void;
  /** «Назад» зі згоди: знову показати вибір мови */
  resetLanguageChoice: () => void;
  /** «Назад» з екрана входу: знову показати слайди (і згоду перед ними) */
  resetOnboardingSeen: () => void;
  /** «Назад» зі слайдів: повернутися до згоди */
  resetConsent: () => void;
  markOnboardingSeen: () => void;
  acceptConsentLocally: () => void;
  setPendingInviteCode: (code: string | null) => void;
  savePendingPlan: (plan: UpdatePlanRequest) => void;
  skipFirstPlan: () => void;
  clearPendingPlan: () => void;
  markGuideSeen: (role: 'parent' | 'child') => void;
  /** Вихід з акаунта: забуваємо все, що належить акаунту (згода й онбординг лишаються — вони на пристрої) */
  resetAccountState: () => void;
  reset: () => void;
}

const initial = {
  languageChosen: false,
  onboardingSeen: false,
  consentAcceptedAt: null,
  pendingInviteCode: null,
  firstPlanDone: false,
  pendingPlan: null,
  guideSeen: {},
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initial,
      hydrated: false,
      markLanguageChosen: () => set({ languageChosen: true }),
      resetLanguageChoice: () => set({ languageChosen: false }),
      resetOnboardingSeen: () => set({ onboardingSeen: false }),
      resetConsent: () => set({ consentAcceptedAt: null }),
      markOnboardingSeen: () => set({ onboardingSeen: true }),
      acceptConsentLocally: () => set({ consentAcceptedAt: new Date().toISOString() }),
      setPendingInviteCode: (code) => set({ pendingInviteCode: code }),
      savePendingPlan: (plan) => set({ pendingPlan: plan, firstPlanDone: true }),
      skipFirstPlan: () => set({ firstPlanDone: true }),
      clearPendingPlan: () => set({ pendingPlan: null }),
      markGuideSeen: (role) => set((s) => ({ guideSeen: { ...s.guideSeen, [role]: true } })),
      resetAccountState: () => set({ firstPlanDone: false, pendingPlan: null, pendingInviteCode: null }),
      reset: () => set({ ...initial }),
    }),
    {
      name: ASYNC_KEYS.onboarding,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        languageChosen: s.languageChosen,
        onboardingSeen: s.onboardingSeen,
        consentAcceptedAt: s.consentAcceptedAt,
        pendingInviteCode: s.pendingInviteCode,
        firstPlanDone: s.firstPlanDone,
        pendingPlan: s.pendingPlan,
        guideSeen: s.guideSeen,
      }),
      onRehydrateStorage: () => () => useOnboardingStore.setState({ hydrated: true }),
    },
  ),
);
