import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeView, StaggerProvider } from '@/shared/motion';
import { colors } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** true (за замовчуванням) → ScrollView; false → звичайний View (центровані екрани) */
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Закріплений низ (головна кнопка екрана) */
  footer?: ReactNode;
  /** Додати нижній safe-area (екрани поза табами) */
  bottomInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Базовий контейнер екрана: фон paper, скрол, pull-to-refresh, закріплений footer.
 * Дає дітям «каскад появи» (StaggerProvider): картки й підписи виникають одна за одною.
 */
export function Screen({ children, scroll = true, refreshing, onRefresh, footer, bottomInset, contentStyle, testID }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = bottomInset ? insets.bottom : 0;
  return (
    <View style={styles.root} testID={testID}>
      <StaggerProvider>
        {scroll ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, { paddingBottom: 24 + (footer ? 0 : bottom) }, contentStyle]}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.green} colors={[colors.green]} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, contentStyle]}>{children}</View>
        )}
      </StaggerProvider>
      {footer ? (
        <FadeView delay={180} style={[styles.footer, { paddingBottom: 16 + bottom }]}>
          {footer}
        </FadeView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: { flexGrow: 1 },
  fill: { flex: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 10, gap: 8, backgroundColor: colors.paper },
});
