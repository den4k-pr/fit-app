import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/theme';
import { AppText } from './AppText';

/** Тимчасова заглушка екрана (екрани авторизації, яких немає в макеті): шлях + розділ ТЗ */
export function ScreenPlaceholder({ route, spec }: { route: string; spec: string }) {
  return (
    <View style={styles.root}>
      <AppText variant="h2" align="center">{route}</AppText>
      <AppText variant="small" color="muted" align="center" style={styles.spec}>{spec}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.paper },
  spec: { marginTop: spacing.sm },
});
