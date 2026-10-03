import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { affectedSystems } from '@/constants/body-systems';
import { CATEGORY_ICON } from '@/constants/exercise-categories';
import { AppText } from '@/shared/ui/AppText';
import { BenefitLine } from './BenefitLine';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { borderWidth, colors, radius } from '@/theme';
import type { ExerciseInfo } from '@/types';

export interface ExerciseDetailRowProps {
  name: string;
  info: ExerciseInfo;
  /** «10 повторень» / «1000 кроків» */
  target?: string;
  /** Якість виконання (оцінка AI 0–100) — у деталях виконаного дня */
  quality?: number | null;
  last?: boolean;
}

/**
 * Рядок вправи в деталях дня (макет: календар «Програма тренувань», деталі нарахування в журналі):
 * ціль · хвилини · якість, чипи систем організму, м'язи, посилання на дослідження.
 */
export function ExerciseDetailRow({ name, info, target, quality, last }: ExerciseDetailRowProps) {
  const { t } = useTranslation();
  const cat = CATEGORY_ICON[info.category];
  const meta = [target, t('plan.minutes', { count: info.durationMin })].filter(Boolean).join(' · ');
  const systems = affectedSystems(info.bodyImpact);
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <IconBadge icon={cat.icon} tone={cat.tone} size={40} />
      <View style={styles.body}>
        <AppText variant="bodyStrong">{name}</AppText>
        <AppText variant="caption" color="muted">
          {meta}
          {quality != null ? ` · ${t('dayDetail.quality')}: ` : ''}
          {quality != null ? <AppText variant="captionStrong" color={quality >= 80 ? 'green' : 'gold'}>{`${quality}%`}</AppText> : null}
        </AppText>
        <BenefitLine benefit={info.benefit} lines={3} />
        {systems.length > 0 ? (
          <View style={styles.chips}>
            {systems.map((s) => (
              <View key={s.key} style={[styles.chip, { backgroundColor: `${colors[s.color]}22` }]}>
                <Icon name={s.icon} size={12} color={s.color} />
                <AppText variant="micro" style={{ color: colors[s.color] }}>{t(`body.${s.key}`)}</AppText>
              </View>
            ))}
          </View>
        ) : null}
        {info.muscles.length > 0 ? (
          <AppText variant="caption" color="muted">{t('dayDetail.muscles', { list: info.muscles.join(', ') })}</AppText>
        ) : null}
        {info.sourceTitle ? (
          <Pressable
            accessibilityRole={info.sourceUrl ? 'link' : undefined}
            disabled={!info.sourceUrl}
            onPress={() => info.sourceUrl && void Linking.openURL(info.sourceUrl)}
            hitSlop={6}
          >
            <AppText variant="mono" color="green">{`🔗 ${info.sourceTitle}`}</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start' },
  divider: { borderBottomWidth: borderWidth.thin, borderBottomColor: colors.border },
  body: { flex: 1, gap: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
});
