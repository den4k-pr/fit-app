import { StyleSheet, View } from 'react-native';
import { borderWidth, colors } from '@/theme';

/** Тонка розділювальна лінія (`.divider`) */
export function Divider() {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: { height: borderWidth.thin, backgroundColor: colors.border, marginVertical: 12 },
});
