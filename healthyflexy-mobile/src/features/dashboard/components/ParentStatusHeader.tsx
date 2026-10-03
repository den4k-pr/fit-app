import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge, type BadgeProps } from '@/shared/ui/Badge';
import type { IconName } from '@/shared/ui/Icon';
import { ParentDayState, type ParentStatus } from '@/types';

export interface ParentStatusHeaderProps {
  status: ParentStatus;
  avatar: string;
}

const LOOK: Record<ParentDayState, { tone: BadgeProps['tone']; icon: IconName }> = {
  [ParentDayState.Completed]: { tone: 'success', icon: 'check-circle' },
  [ParentDayState.InProgress]: { tone: 'warning', icon: 'timer' },
  [ParentDayState.NotStarted]: { tone: 'muted', icon: 'clock' },
  [ParentDayState.RestDay]: { tone: 'muted', icon: 'leaf' },
};

/** Шапка картки дашборду: аватар (емодзі доречні для членів сім'ї), ім'я, стан дня й позначка зі значком */
export function ParentStatusHeader({ status, avatar }: ParentStatusHeaderProps) {
  const { t } = useTranslation();
  const values = { done: status.exercisesDone, total: status.exercisesTotal, count: status.exercisesTotal };
  const look = LOOK[status.state];
  return (
    <View style={styles.row}>
      <Avatar symbol={avatar} uri={status.parentAvatarUrl} size={46} tone="dark" />
      {/* позначка стану — під ім'ям: у рядку з нею довге ім'я обрізалось («Людмила Конс…») */}
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={2}>{status.parentLabel ?? status.parentName}</AppText>
        <AppText variant="caption" color="muted" numberOfLines={2}>{t(`dashboard.status.${status.state}`, values)}</AppText>
        <View style={styles.badge}>
          <Badge size="sm" tone={look.tone} icon={look.icon} label={t(`dashboard.badge.${status.state}`, values)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  texts: { flex: 1, gap: 2 },
  badge: { marginTop: 4 },
});
