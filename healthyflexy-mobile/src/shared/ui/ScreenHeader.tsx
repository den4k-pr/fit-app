import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Reveal } from '@/shared/motion';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
}

/** Заголовок екрана: кругла кнопка «назад», серифний заголовок, підпис, слот справа */
export function ScreenHeader({ title, subtitle, onBack, backLabel = 'Back', right }: ScreenHeaderProps) {
  return (
    <Reveal>
      <View style={styles.row}>
        {onBack ? <IconButton icon="arrow-left" onPress={onBack} accessibilityLabel={backLabel} /> : null}
        <View style={styles.titles}>
          <AppText variant="h2" numberOfLines={2}>{title}</AppText>
          {subtitle ? <AppText variant="small" color="muted">{subtitle}</AppText> : null}
        </View>
        {right}
      </View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, gap: 2 },
});
