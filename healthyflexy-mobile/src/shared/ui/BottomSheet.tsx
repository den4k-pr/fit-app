import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeView, useRevealStyle } from '@/shared/motion';
import { colors, radius, shadows } from '@/theme';
import { AppText } from './AppText';

export interface BottomSheetProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
  /** Закріплений низ аркуша (головні кнопки) */
  footer?: ReactNode;
}

function Sheet({ title, children, footer }: Pick<BottomSheetProps, 'title' | 'children' | 'footer'>) {
  const anim = useRevealStyle(40, 40);
  const insets = useSafeAreaInsets();
  return (
    <Animated.View style={[styles.sheet, { paddingBottom: 16 + insets.bottom }, anim]}>
      <View style={styles.handle} />
      {title ? <AppText variant="h2" align="center" style={styles.title}>{title}</AppText> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Animated.View>
  );
}

/** Нижній аркуш (`.mbg/.msh` з макета): затемнення, «ручка», заголовок PT Serif, прокручуваний вміст */
export function BottomSheet({ visible, title, onClose, closeLabel, children, footer }: BottomSheetProps) {
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FadeView style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={closeLabel} />
          <Sheet title={title} footer={footer}>{children}</Sheet>
        </FadeView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '88%', paddingHorizontal: 20, ...shadows.raised },
  handle: { width: 40, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 14 },
  title: { marginBottom: 12 },
  content: { gap: 12, paddingBottom: 8 },
  footer: { gap: 8, paddingTop: 10 },
});
