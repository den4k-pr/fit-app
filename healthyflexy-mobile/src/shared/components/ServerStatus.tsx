import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { subscribeHealth } from '@/lib/health-monitor';
import { healthUrl, isLocalhostUrl } from '@/lib/server-url';
import { FadeView } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { colors } from '@/theme';

/**
 * ЛИШЕ для розробки (`__DEV__`): червона смуга, якщо застосунок не бачить сервер, з адресою і підказкою.
 * Найчастіша причина: у EXPO_PUBLIC_API_URL стоїть `localhost` (на телефоні це сам телефон) або комп'ютер в іншій мережі.
 * Смуга сама зникає, щойно сервер стає доступним. У релізній збірці не рендериться.
 * `<AppHeader>` (а з ним і цей компонент) монтується в кожному табі окремо — опитування живе в
 * `health-monitor` як єдиний спільний цикл, щоб таби не множили паралельні запити до `/health`.
 */
export function ServerStatus() {
  const { t } = useTranslation();
  const [down, setDown] = useState(false);

  useEffect(() => {
    if (!__DEV__) return undefined;
    return subscribeHealth(setDown);
  }, []);

  if (!__DEV__ || !down) return null;
  return (
    <FadeView>
      <View style={styles.bar} accessibilityRole="alert">
        <Icon name="wifi-off" size={18} color="surface" />
        <AppText variant="caption" style={styles.text}>
          {t('dev.serverDown', { url: healthUrl() })}
          {isLocalhostUrl() ? `\n${t('dev.localhostHint')}` : ''}
        </AppText>
      </View>
    </FadeView>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.red, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { color: colors.surface, flex: 1 },
});
