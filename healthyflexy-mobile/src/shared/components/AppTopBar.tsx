import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/shared/ui/AppText';
import { colors, fonts } from '@/theme';
import { LogoMark } from './LogoMark';

export interface AppTopBarProps {
  title: string;
  children?: ReactNode;
}

/** Верхня смуга (`.sbar` з макета): знак застосунку й назва на лісовому тлі м'ятним кольором */
export function AppTopBar({ title, children }: AppTopBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <LogoMark size={30} />
        <AppText variant="h3" style={styles.title}>{title}</AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.forest },
  row: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { color: colors.mint, fontFamily: fonts.serifBold, fontSize: 19, lineHeight: 24 },
});
