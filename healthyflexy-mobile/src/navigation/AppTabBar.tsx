import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/shared/ui/AppText';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { colors, fonts, layout, radius } from '@/theme';
import { TAB_META } from './tab-meta';

function TabItem({ icon, label, focused, onPress }: { icon: IconName; label: string; focused: boolean; onPress: () => void }) {
  const pill = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: 180 }),
    transform: [{ scaleX: withSpring(focused ? 1 : 0.5, { damping: 15, stiffness: 220 }) }],
  }));
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: withSpring(focused ? -1 : 0, { damping: 14, stiffness: 240 }) }] }));
  return (
    <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }} onPress={onPress} style={styles.item}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.pill, pill]} />
        <Animated.View style={lift}>
          <Icon name={icon} size={23} color={focused ? 'white' : 'mutedOnDark'} strokeWidth={focused ? 2.3 : 1.9} />
        </Animated.View>
      </View>
      {/* один рядок у своїй комірці: при великому системному шрифті підпис зменшується, а не налазить на сусідні вкладки */}
      <AppText
        variant="micro"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={1.2}
        style={[styles.label, { color: focused ? colors.white : colors.mutedOnDark }]}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

/** Нижня навігація (`.nav` з макета): пласка лісова панель; активна вкладка — біла, з ледь помітною «пігулкою» */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: layout.tabBarHeight + insets.bottom, paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        return (
          <TabItem
            key={route.key}
            icon={meta.icon}
            label={t(meta.labelKey as never) as string}
            focused={focused}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                navigation.navigate(route.name, route.params);
              }
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.forest, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 4 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: layout.hitTarget },
  iconWrap: { width: 60, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', width: 60, height: 32, borderRadius: radius.pill, backgroundColor: colors.line },
  label: { fontFamily: fonts.sansSemiBold, maxWidth: '100%', paddingHorizontal: 2 },
});
