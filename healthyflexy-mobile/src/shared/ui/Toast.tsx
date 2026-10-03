import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore } from '@/store/ui.store';
import { colors, layout, radius, shadows } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** Тост знизу: з'їжджає вгору з іконкою «готово», через кілька секунд плавно зникає */
export function ToastHost() {
  const toast = useUiStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.duration(260).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutDown.duration(200).reduceMotion(ReduceMotion.System)}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { bottom: layout.tabBarHeight + insets.bottom + 18 }]}
    >
      <View style={styles.icon}>
        <Icon name="check" size={16} color="white" strokeWidth={3} />
      </View>
      <AppText variant="bodyMedium" style={styles.text}>{toast.message}</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.forest, borderRadius: radius.md + 2, paddingHorizontal: 18, paddingVertical: 14, zIndex: 100, ...shadows.raised },
  icon: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.greenButton, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.white, flex: 1 },
});
