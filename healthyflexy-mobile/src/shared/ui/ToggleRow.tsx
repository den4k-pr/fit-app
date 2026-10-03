import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { IconBadge } from './IconBadge';
import type { IconName } from './Icon';
import { Switch } from './Switch';

export interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
  icon?: IconName;
}

export function ToggleRow({ label, value, onValueChange, description, icon }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      {icon ? <IconBadge icon={icon} tone="teal" size={42} /> : null}
      <View style={styles.texts}>
        <AppText variant="bodyStrong">{label}</AppText>
        {description ? <AppText variant="caption" color="muted">{description}</AppText> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  texts: { flex: 1 },
});
