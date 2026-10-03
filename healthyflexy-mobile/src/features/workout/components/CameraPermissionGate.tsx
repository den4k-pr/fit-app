import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet } from 'react-native';
import { CameraIllustration } from '@/shared/illustrations';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

export interface CameraPermissionGateProps {
  canAskAgain: boolean;
  onRequest: () => void;
}

/** Камера ще не дозволена: пояснення людською мовою, «Дозволити» / «Відкрити налаштування» (без камери вправу не зарахувати) */
export function CameraPermissionGate({ canAskAgain, onRequest }: CameraPermissionGateProps) {
  const { t } = useTranslation();
  return (
    <Card style={styles.card}>
      <CameraIllustration size={170} />
      <AppText variant="h3" align="center">{t('exercise.camera.title')}</AppText>
      <AppText variant="small" color="soft" align="center">{t('exercise.camera.body')}</AppText>
      {canAskAgain ? <Button label={t('exercise.camera.allow')} icon="camera" onPress={onRequest} /> : <Button label={t('exercise.camera.openSettings')} icon="settings" onPress={() => void Linking.openSettings()} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 12, marginHorizontal: 0 },
});
