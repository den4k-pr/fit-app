import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/ui/AppText';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import type { Program } from '@/types';

export interface ProgramCardProps {
  program: Program;
  isActive?: boolean;
  onAssign: () => void;
  onEdit?: () => void;
  /** Тап по картці (не по кнопках) → відкрити деталі програми */
  onOpenDetails: () => void;
  assignLoading?: boolean;
}

/** Картка програми: назва, тривалість, кількість вправ; тап відкриває деталі, кнопки — швидкі дії */
export function ProgramCard({ program, isActive, onAssign, onEdit, onOpenDetails, assignLoading }: ProgramCardProps) {
  const { t } = useTranslation();
  return (
    <Card tone={isActive ? 'success' : 'default'} onPress={onOpenDetails}>
      <View style={styles.head}>
        <IconBadge icon={program.isPreset ? 'sparkles' : 'clipboard'} tone={program.isPreset ? 'gold' : 'teal'} size={40} shape="squircle" />
        <View style={styles.titles}>
          <AppText variant="bodyStrong">{program.name}</AppText>
          <AppText variant="small" color="muted">
            {t(`programs.duration.${program.durationType}`)} · {t('programs.exercisesCount', { count: program.exercises.length })}
          </AppText>
          {isActive ? (
            <View style={styles.activeBadge}>
              <Badge label={t('programs.active')} tone="success" icon="check" size="sm" />
            </View>
          ) : null}
        </View>
        <Icon name="chevron-right" size={20} color="muted" />
      </View>
      {program.description ? (
        <AppText variant="small" color="soft" style={styles.description}>{program.description}</AppText>
      ) : null}
      {!isActive || onEdit ? (
        <View style={styles.actions}>
          {!isActive ? <Button size="sm" label={t('programs.assign')} onPress={onAssign} loading={assignLoading} /> : null}
          {onEdit ? <Button variant="ghost" size="sm" icon="edit" label={t('programs.edit')} onPress={onEdit} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, gap: 2 },
  activeBadge: { marginTop: 4 },
  description: { marginTop: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
});
