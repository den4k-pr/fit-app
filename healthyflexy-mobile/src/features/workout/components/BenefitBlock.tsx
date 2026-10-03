import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { PressableScale } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import { IconBadge } from '@/shared/ui/IconBadge';
import { borderWidth, colors, fonts, radius } from '@/theme';

export interface BenefitBlockProps {
  benefit: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
}

/** «Користь»: чому ця вправа корисна + джерело. Не медична рекомендація (див. згоду). */
export function BenefitBlock({ benefit, sourceTitle, sourceUrl }: BenefitBlockProps) {
  const { t } = useTranslation();
  return (
    <View>
      <View style={styles.benefit}>
        <IconBadge icon="sparkles" tone="teal" size={40} />
        <View style={styles.texts}>
          <AppText variant="captionStrong" style={styles.head}>{t('exercise.benefit')}</AppText>
          <AppText variant="small">{benefit}</AppText>
        </View>
      </View>
      {sourceTitle ? (
        <PressableScale accessibilityRole={sourceUrl ? 'link' : 'text'} disabled={!sourceUrl} onPress={() => sourceUrl && void Linking.openURL(sourceUrl)} style={styles.chip} scaleTo={0.96}>
          <Icon name="info" size={14} color="green" />
          <AppText variant="caption" color="green" style={styles.chipText}>{sourceTitle}</AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  benefit: { flexDirection: 'row', gap: 12, backgroundColor: colors.greenLight, borderColor: colors.greenBorder, borderWidth: borderWidth.thin, borderRadius: radius.md, padding: 14, alignItems: 'flex-start' },
  texts: { flex: 1, gap: 4 },
  head: { color: colors.pillGreenText },
  chip: { alignSelf: 'flex-start', marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.shade, borderColor: colors.border, borderWidth: borderWidth.thin, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: fonts.mono, fontSize: 12 },
});
