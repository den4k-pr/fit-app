import { useTranslation } from 'react-i18next';
import { SERVER_LANGUAGE } from '@/constants/languages';
import { setAppLanguage } from '@/i18n';
import { useSettingsStore } from '@/store/settings.store';
import { AppLanguage } from '@/types';
import { useUpdateProfile } from './useUpdateProfile';

/**
 * Мова інтерфейсу: миттєво в i18n + вибір запам'ятовується на пристрої + PATCH /users/me { language }
 * (push/SMS/листи йдуть мовою профілю; для російської на сервері поки українська, див. SERVER_LANGUAGE).
 */
export function useLanguageSwitch(): { language: AppLanguage; change: (language: AppLanguage) => Promise<void> } {
  const { i18n } = useTranslation();
  const update = useUpdateProfile();
  return {
    language: (i18n.language as AppLanguage) ?? AppLanguage.Uk,
    change: async (next) => {
      await setAppLanguage(next);
      useSettingsStore.getState().setLanguageOverride(next);
      await update.mutateAsync({ language: SERVER_LANGUAGE[next] });
    },
  };
}
