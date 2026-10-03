import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { shareText } from '@/lib/share';
import { PopIn } from '@/shared/motion';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { showToast } from '@/store/ui.store';
import { colors, fonts, radius, shadows } from '@/theme';
import type { Invite } from '@/types';

/** Код запрошення (6 символів) на темній «перепустці» + «Поділитися» (WhatsApp, SMS…) і «Скопіювати». Діє 7 днів. */
export function InviteCodeCard({ invite }: { invite: Invite }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const expires = fmt.shortDate(invite.expiresAt.slice(0, 10));

  const copy = async () => {
    await Clipboard.setStringAsync(invite.code);
    showToast(t('invite.copied'));
  };

  return (
    <View style={styles.wrap}>
      <PopIn>
        <View style={styles.ticket} accessible accessibilityLabel={`${t('invite.code')}: ${invite.code.split('').join(' ')}`}>
          <AppText variant="micro" color="mutedOnDark" style={styles.kicker}>{t('invite.code').toUpperCase()}</AppText>
          <AppText style={styles.code}>{invite.code}</AppText>
          <View style={styles.expires}>
            <Icon name="clock" size={14} color="mutedOnDark" />
            <AppText variant="caption" color="mutedOnDark">{t('invite.expires', { date: expires })}</AppText>
          </View>
        </View>
      </PopIn>
      <Button icon="share" label={t('invite.share')} onPress={() => void shareText(t('invite.message', { code: invite.code, link: invite.deepLink }))} />
      <Button variant="secondary" icon="copy" label={t('invite.copy')} onPress={() => void copy()} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, marginTop: 8 },
  ticket: { backgroundColor: colors.forest, borderRadius: radius.lg, paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', gap: 6, ...shadows.raised },
  kicker: { letterSpacing: 1.6 },
  code: { fontFamily: fonts.monoMedium, fontSize: 38, lineHeight: 46, letterSpacing: 9, color: colors.mint },
  expires: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
