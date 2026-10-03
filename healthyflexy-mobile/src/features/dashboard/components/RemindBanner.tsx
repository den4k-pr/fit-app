import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { RELATIONSHIP_GENDER } from '@/constants/relationships';
import { useSendReminder } from '@/features/family/hooks/useSendReminder';
import { useCountdown } from '@/shared/hooks/useCountdown';
import { useFormat } from '@/shared/hooks/useFormat';
import { addDaysIso } from '@/lib/iso-date';
import { FadeView, PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { colors, radius } from '@/theme';
import { ParentDayState, type ParentStatus, type RelationshipType } from '@/types';

/**
 * Помаранчевий банер (макет): «Мама ще не займалася сьогодні · Остання тренування: вчора» + «Нагадати».
 * Лише коли день запланований і ще не почався/не завершений; після нагадування — відлік до наступного (2 год).
 */
export function RemindBanner({ status, label, relationship }: { status: ParentStatus; label: string; relationship: RelationshipType }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const send = useSendReminder();
  const cooldown = useCountdown(status.nextReminderAllowedAt);

  if (status.state !== ParentDayState.NotStarted && status.state !== ParentDayState.InProgress) return null;

  const gender = RELATIONSHIP_GENDER[relationship];
  const title =
    status.state === ParentDayState.NotStarted
      ? t(`dashboard.banner.notYet_${gender}`, { name: label })
      : t('dashboard.banner.inProgress', { name: label, done: status.exercisesDone, total: status.exercisesTotal });
  const lastDate = status.lastCompletedDate;
  const when = !lastDate
    ? null
    : lastDate === status.localDate
      ? t('common.today')
      : lastDate === addDaysIso(status.localDate, -1)
        ? t('common.yesterday')
        : fmt.shortDate(lastDate);
  // у процесі — скільки лишилось; ще не починали — коли займались востаннє
  const last =
    status.state === ParentDayState.InProgress
      ? t('dashboard.banner.left', { count: Math.max(0, status.exercisesTotal - status.exercisesDone) })
      : when
        ? t('dashboard.banner.last', { when: when.toLowerCase() })
        : t('dashboard.banner.never');
  const waiting = !status.canRemind && cooldown.secondsLeft > 0;

  // кнопка — під текстом: у рядку з нею довге ім'я стискалося у вузьку колонку
  return (
    <FadeView style={styles.banner}>
      <View style={styles.top}>
        <Icon name="bell-ring" size={24} color="warnStrong" />
        <View style={styles.texts}>
          <AppText variant="smallStrong" color="warnStrong">{title}</AppText>
          <AppText variant="caption" color="warnText">{last}</AppText>
        </View>
      </View>
      <PressableScale
        accessibilityRole="button"
        disabled={!status.canRemind || send.isPending}
        onPress={() => send.mutate()}
        haptic
        style={[styles.button, !status.canRemind && styles.buttonOff]}
      >
        <AppText variant="captionStrong" color="white">{waiting ? cooldown.label : t('dashboard.remind')}</AppText>
      </PressableScale>
    </FadeView>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 16, marginBottom: 12, marginTop: 4, gap: 10, backgroundColor: colors.warnBg, borderWidth: 1, borderColor: colors.warnBorder, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  texts: { flex: 1, gap: 2 },
  button: { alignSelf: 'flex-start', marginLeft: 34, backgroundColor: colors.warnButton, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  buttonOff: { opacity: 0.5 },
});
