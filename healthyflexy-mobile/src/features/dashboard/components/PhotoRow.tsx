import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { photosHref } from '@/constants/routes';
import { useFormat } from '@/shared/hooks/useFormat';
import { AppText } from '@/shared/ui/AppText';
import { Badge } from '@/shared/ui/Badge';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { borderWidth, colors } from '@/theme';
import type { ExerciseRecord } from '@/types';

export interface PhotoRowProps {
  record: ExerciseRecord;
  isLast?: boolean;
}

/** Рядок вправи: значок, назва, час, «3 фото» / «без фото» / «Фото видалено»; натискання → галерея (лише якщо фото є) */
export function PhotoRow({ record, isLast }: PhotoRowProps) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const router = useRouter();
  const viewable = record.photoCount > 0 && !record.photosDeleted;

  return (
    <Pressable
      accessibilityRole={viewable ? 'button' : 'text'}
      disabled={!viewable}
      onPress={() => router.push(photosHref(record.id))}
      style={({ pressed }) => [styles.row, !isLast && styles.divider, pressed && styles.pressed]}
    >
      <IconBadge icon={viewable ? 'camera' : record.photosDeleted ? 'image-off' : 'camera-off'} tone={viewable ? 'teal' : 'muted'} size={38} shape="squircle" />
      {/* мітка («12 фото», «Фото удалены») — під назвою, поруч із часом: у рядку вона стискала назву */}
      <View style={styles.texts}>
        <AppText variant="bodyMedium" color={viewable ? 'ink' : 'muted'} numberOfLines={2}>{record.exerciseName}</AppText>
        <View style={styles.meta}>
          <AppText variant="caption" color="muted">{fmt.time(record.completedAt)}</AppText>
          {record.steps !== null ? <Badge size="sm" tone="success" icon="footprints" label={t('exercise.steps', { count: record.steps })} /> : null}
          {record.skipped ? <Badge size="sm" tone="muted" icon="skip" label={t('today.skippedLabel')} /> : null}
          {record.photoCount === 0 && record.steps === null && !record.skipped ? <Badge size="sm" tone="warning" label={t('dashboard.noPhotos')} /> : null}
          {record.photoCount > 0 && record.photosDeleted ? <Badge size="sm" tone="muted" label={t('dashboard.photosDeleted')} /> : null}
          {viewable ? <Badge size="sm" tone="success" label={t('dashboard.photoCount', { count: record.photoCount })} /> : null}
        </View>
      </View>
      {viewable ? <Icon name="chevron-right" size={18} color="muted" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, minHeight: 60 },
  divider: { borderBottomWidth: borderWidth.hairline, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.shade },
  texts: { flex: 1, gap: 4 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
});
