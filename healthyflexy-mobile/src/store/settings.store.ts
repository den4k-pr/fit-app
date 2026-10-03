import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { ASYNC_KEYS } from '@/constants/storage-keys';
import type { AppLanguage } from '@/types';

/** Локальні налаштування пристрою (зберігаються в AsyncStorage). */
interface SettingsState {
  /** Мова, обрана до входу (екрани consent/онбординг). null → мова пристрою */
  languageOverride: AppLanguage | null;
  /** «Будильник» батька/матері: локальне нагадування «Час для вправ» (ТЗ §8.7). Час задає дитина в плані. */
  localRemindersEnabled: boolean;
  /**
   * Дитина з кількома батьками: сім'я, обрана в перемикачі. Іде на сервер заголовком `X-Family-Id`
   * (сервер бере її лише якщо дитина справді учасник). null → перша сім'я.
   */
  activeFamilyId: string | null;
  /** Медичне попередження перед першою вправою вже показано й прийнято (макет: один раз) */
  medicalWarningAccepted: boolean;
  /** Голосовий помічник під час вправ: техніка, «вниз/вверх», рахунок, залишок часу */
  voiceEnabled: boolean;
  setLanguageOverride: (language: AppLanguage | null) => void;
  setLocalRemindersEnabled: (enabled: boolean) => void;
  setActiveFamilyId: (familyId: string | null) => void;
  acceptMedicalWarning: () => void;
  setVoiceEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      languageOverride: null,
      localRemindersEnabled: true,
      activeFamilyId: null,
      medicalWarningAccepted: false,
      voiceEnabled: true,
      setLanguageOverride: (language) => set({ languageOverride: language }),
      setLocalRemindersEnabled: (enabled) => set({ localRemindersEnabled: enabled }),
      setActiveFamilyId: (activeFamilyId) => set({ activeFamilyId }),
      acceptMedicalWarning: () => set({ medicalWarningAccepted: true }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
    }),
    { name: ASYNC_KEYS.settings, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
