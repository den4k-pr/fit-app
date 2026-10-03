import { useTranslation } from 'react-i18next';
import { ToggleRow } from '@/shared/ui/ToggleRow';
import { stopSpeaking } from '@/services/voice/speech';
import { Divider } from '@/shared/ui/Divider';
import { useAuthStore } from '@/store/auth.store';
import { useSettingsStore } from '@/store/settings.store';
import { useUpdateProfile } from '../hooks/useUpdateProfile';

/**
 * Перемикачі: push-сповіщення (`pushEnabled` у профілі; сервер не надсилає push, коли вимкнено)
 * і голосовий помічник під час вправ (налаштування пристрою).
 */
export function NotificationSettings() {
  const { t } = useTranslation();
  const enabled = useAuthStore((s) => s.user?.pushEnabled ?? false);
  const voice = useSettingsStore((s) => s.voiceEnabled);
  const update = useUpdateProfile();
  return (
    <>
      <ToggleRow
        icon="bell"
        label={t('profile.notifications')}
        description={t('profile.notificationsHint')}
        value={enabled}
        onValueChange={(pushEnabled) => update.mutate({ pushEnabled })}
      />
      <Divider />
      <ToggleRow
        icon="volume"
        label={t('profile.voice')}
        description={t('profile.voiceHint')}
        value={voice}
        onValueChange={(on) => {
          useSettingsStore.getState().setVoiceEnabled(on);
          if (!on) stopSpeaking();
        }}
      />
    </>
  );
}
