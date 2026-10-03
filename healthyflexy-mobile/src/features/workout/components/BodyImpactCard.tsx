import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { BODY_SYSTEMS, impactLevel } from '@/constants/body-systems';
import { AppText } from '@/shared/ui/AppText';
import { Card } from '@/shared/ui/Card';
import { Icon } from '@/shared/ui/Icon';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { colors } from '@/theme';
import type { BodyImpact } from '@/types';

/**
 * «Вплив на організм» (макет, «Сьогодні»): для кожної системи — найсильніший вплив серед вправ дня,
 * смуга свого кольору й оцінка «Сильно / Помітно / Помірно».
 */
export function BodyImpactCard({ impacts }: { impacts: (BodyImpact | null)[] }) {
  const { t } = useTranslation();
  const known = impacts.filter((i): i is BodyImpact => i !== null);
  if (known.length === 0) return null;
  return (
    <Card>
      {BODY_SYSTEMS.map((system, index) => {
        const value = Math.min(100, Math.max(...known.map((i) => i[system.key])));
        return (
          <View key={system.key} style={[styles.row, index === BODY_SYSTEMS.length - 1 && styles.last]}>
            <View style={styles.head}>
              <Icon name={system.icon} size={16} color={system.color} />
              <AppText variant="small" style={styles.name}>{t(`body.${system.key}`)}</AppText>
              <AppText variant="smallStrong" style={{ color: colors[system.color] }}>{t(`body.level.${impactLevel(value)}`)}</AppText>
            </View>
            <ProgressBar value={value} max={100} height={7} fill={system.color} />
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 10, gap: 5 },
  last: { marginBottom: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1 },
});
