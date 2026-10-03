import { StyleSheet } from 'react-native';
import { Reveal } from '@/shared/motion';
import { layout } from '@/theme';
import { AppText } from './AppText';

/** Підпис секції: дрібні капітальні літери моноширинним шрифтом */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Reveal>
      <AppText variant="sectionLabel" color="muted" style={styles.label}>{children.toUpperCase()}</AppText>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  label: { paddingHorizontal: layout.screenPadding, paddingTop: 14, paddingBottom: 6 },
});
