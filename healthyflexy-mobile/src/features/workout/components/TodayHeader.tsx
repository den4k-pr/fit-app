import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ROUTES } from '@/constants/routes';
import { dayPartOf } from '@/lib/format-date';
import { PressableScale } from '@/shared/motion';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Avatar } from '@/shared/ui/Avatar';
import { Icon } from '@/shared/ui/Icon';
import { colors, radius } from '@/theme';
import type { Currency, ISODate, Money } from '@/types';

export interface TodayHeaderProps {
  name: string;
  avatar: string;
  avatarUrl?: string | null;
  localDate: ISODate;
  /** Фонд і зароблене за поточний місяць (null — статистика ще вантажиться) */
  month: { fund: Money; earned: Money } | null;
  currency: Currency;
}

/** Верх картки «Сьогодні»: аватар, привітання за порою дня, дата й «До отримання» (натискається → Прогрес) */
export function TodayHeader({ name, avatar, avatarUrl, localDate, month, currency }: TodayHeaderProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Avatar symbol={avatar} uri={avatarUrl} size={48} tone="dark" />
        <View style={styles.texts}>
          <AppText variant="h3" style={styles.greeting}>{t(`today.greeting.${dayPartOf(new Date())}`, { name })}</AppText>
          <AppText variant="caption" color="muted">{fmt.longDate(localDate)}</AppText>
        </View>
      </View>
      {month ? (
        <PressableScale accessibilityRole="button" hitSlop={8} onPress={() => router.navigate(ROUTES.parentHistory)} style={styles.owed} haptic>
          <Icon name="piggy" size={18} color="forest" />
          <AppText variant="captionStrong" style={styles.owedText}>
            {t('today.fundPill', { earned: fmt.money(month.earned, currency), fund: fmt.money(month.fund, currency) })}
          </AppText>
          <Icon name="chevron-right" size={16} color="soft" />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  texts: { flex: 1, gap: 2 },
  greeting: { color: colors.ink },
  // не ширша за картку: довгий текст (рос./пол., великий системний шрифт) переноситься, а не виходить за край
  owed: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.greenLight, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.greenBorder },
  owedText: { color: colors.forest, flexShrink: 1 },
});
