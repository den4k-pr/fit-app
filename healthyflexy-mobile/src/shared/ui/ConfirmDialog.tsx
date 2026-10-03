import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { FadeView, useRevealStyle } from '@/shared/motion';
import { colors, radius, shadows } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  /** Показати message великим шрифтом (номер телефону / адреса) */
  highlight?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Діалог підтвердження (`.mbg/.msh` з макета): затемнення плавно проявляється, аркуш виїжджає знизу. Дві великі кнопки. */
function Sheet({ children }: { children: ReactNode }) {
  const anim = useRevealStyle(60, 40);
  const insets = useSafeAreaInsets();
  return (
    <Animated.View style={[styles.dialog, { paddingBottom: 20 + insets.bottom }, anim]}>
      <View style={styles.handle} />
      {children}
    </Animated.View>
  );
}

export function ConfirmDialog({ visible, title, message, confirmLabel, cancelLabel, destructive, highlight, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <FadeView style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel={cancelLabel} />
        <Sheet>
          <AppText variant="h2" align="center">{title}</AppText>
          <AppText variant={highlight ? (message.length > 16 ? 'h2' : 'h1') : 'body'} color={highlight ? 'forest' : 'soft'} align="center">{message}</AppText>
          <View style={styles.buttons}>
            <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} loading={loading} onPress={onConfirm} />
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} disabled={loading} />
          </View>
        </Sheet>
      </FadeView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  dialog: { backgroundColor: colors.paper, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, gap: 12, ...shadows.raised },
  handle: { width: 40, height: 4, borderRadius: radius.pill, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 6 },
  buttons: { gap: 10, marginTop: 8 },
});
