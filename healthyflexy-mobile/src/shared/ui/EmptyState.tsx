import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { EmptyIllustration } from '@/shared/illustrations';
import { AppText } from './AppText';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Власна ілюстрація (за замовчуванням — порожня рамка) */
  illustration?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, illustration, action }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {illustration ?? <EmptyIllustration size={150} />}
      <AppText variant="h3" align="center">{title}</AppText>
      {description ? <AppText variant="small" color="muted" align="center">{description}</AppText> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, padding: 20 },
});
