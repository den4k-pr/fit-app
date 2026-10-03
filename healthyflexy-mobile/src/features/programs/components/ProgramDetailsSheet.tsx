import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { CATEGORY_ICON } from '@/constants/exercise-categories';
import { BenefitLine } from '@/shared/components/BenefitLine';
import { FadeView, useRevealStyle } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Divider } from '@/shared/ui/Divider';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { borderWidth, colors, radius, shadows } from '@/theme';
import type { Program } from '@/types';

export interface ProgramDetailsSheetProps {
  program: Program | null;
  isActive: boolean;
  canEdit: boolean;
  assignLoading?: boolean;
  onAssign: () => void;
  onEdit: () => void;
  onClose: () => void;
}

/** Bottom sheet із деталями програми: опис, переваги, повний склад вправ. Тап по картці програми відкриває це. */
export function ProgramDetailsSheet({ program, isActive, canEdit, assignLoading, onAssign, onEdit, onClose }: ProgramDetailsSheetProps) {
  const { t } = useTranslation();
  const reveal = useRevealStyle(0, 30);

  return (
    <Modal transparent visible={program !== null} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <FadeView style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.cancel')} />
        {program ? (
          <Animated.View style={[styles.sheet, reveal]}>
            <View style={styles.handle} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.head}>
                <IconBadge icon={program.isPreset ? 'sparkles' : 'clipboard'} tone={program.isPreset ? 'gold' : 'teal'} size={48} shape="squircle" />
                <View style={styles.headTexts}>
                  <AppText variant="h2">{program.name}</AppText>
                  <AppText variant="small" color="muted">
                    {t(`programs.duration.${program.durationType}`)} · {t('programs.exercisesCount', { count: program.exercises.length })}
                  </AppText>
                </View>
              </View>

              {program.description ? (
                <AppText variant="body" color="soft" style={styles.description}>{program.description}</AppText>
              ) : null}

              {program.highlights.length > 0 ? (
                <View style={styles.highlights}>
                  {program.highlights.map((h) => (
                    <View key={h} style={styles.highlightRow}>
                      <Icon name="check-circle" size={18} color="teal" />
                      <AppText variant="small" style={styles.highlightText}>{h}</AppText>
                    </View>
                  ))}
                </View>
              ) : null}

              <Divider />
              <AppText variant="captionStrong" color="muted" style={styles.exercisesLabel}>{t('programs.exercisesSection')}</AppText>
              {[...program.exercises]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((exercise, index) => {
                  const icon = CATEGORY_ICON[exercise.category];
                  return (
                    <View key={exercise.exerciseId} style={styles.exerciseRow}>
                      <AppText variant="small" color="muted" style={styles.exerciseIndex}>{index + 1}</AppText>
                      <IconBadge icon={icon.icon} tone={icon.tone} size={32} shape="squircle" />
                      <View style={styles.exerciseName}>
                        <AppText variant="small">{exercise.name}</AppText>
                        <BenefitLine benefit={exercise.benefit} />
                        {exercise.variantGroup ? (
                          <AppText variant="micro" color="muted">{t('programs.rotates')}</AppText>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
            </ScrollView>
            <View style={styles.footer}>
              {canEdit ? (
                <Button variant="secondary" icon="edit" label={t('programs.edit')} onPress={onEdit} />
              ) : (
                <Button label={t('programs.assign')} onPress={onAssign} loading={assignLoading} disabled={isActive} />
              )}
              <Button variant="ghost" label={t('common.cancel')} onPress={onClose} />
            </View>
          </Animated.View>
        ) : null}
      </FadeView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '88%', ...shadows.raised },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
  content: { padding: 20, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  headTexts: { flex: 1, gap: 2 },
  description: { marginTop: 8 },
  highlights: { marginTop: 14, gap: 10 },
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  highlightText: { flex: 1 },
  exercisesLabel: { marginBottom: 10 },
  exerciseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  exerciseIndex: { width: 18 },
  exerciseName: { flex: 1 },
  footer: { padding: 16, gap: 8, borderTopWidth: borderWidth.thin, borderTopColor: colors.border },
});
