import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { PROFILE } from '@/constants/limits';
import { ROUTES } from '@/constants/routes';
import { useUpdateProfile } from '@/features/profile/hooks/useUpdateProfile';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Screen } from '@/shared/ui/Screen';
import { ScreenHeader } from '@/shared/ui/ScreenHeader';
import { TextField } from '@/shared/ui/TextField';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types';
import { AuthSteps } from '../components/AuthSteps';
import { staysInAuth } from '../lib/app-area';
import { useStepBack } from '../hooks/useStepBack';

/** «Розкажіть про себе» (ТЗ §5.3): ім'я (обов'язково) і вік (лише для батька/матері, за бажанням) */
export function ProfileSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  // повернення з наступного кроку: уже введені дані підставлені для редагування
  const [name, setName] = useState(user?.name ?? '');
  const [age, setAge] = useState(user?.age != null ? String(user.age) : '');
  // назад — до вибору ролі (роль можна змінити, поки немає сім'ї)
  const back = useStepBack(() => router.replace(ROUTES.role));
  const update = useUpdateProfile();
  const askAge = role === UserRole.Parent;
  const ageNumber = askAge && age ? Number(age) : undefined;
  const ageInvalid = ageNumber !== undefined && (!Number.isInteger(ageNumber) || ageNumber < PROFILE.AGE_MIN || ageNumber > PROFILE.AGE_MAX);

  return (
    <Screen
      bottomInset
      footer={
        <Button
          label={t('common.continue')}
          iconRight="arrow-right"
          disabled={name.trim().length === 0 || ageInvalid}
          loading={update.isPending}
          onPress={() =>
            update.mutate({ name: name.trim(), ...(ageNumber !== undefined ? { age: ageNumber } : {}) }, { onSuccess: () => staysInAuth() && router.replace(ROUTES.root) })
          }
        />
      }
    >
      <AuthSteps current={4} />
      <ScreenHeader title={t('auth.profile.title')} onBack={back} backLabel={t('common.back')} />
      <Card>
        <TextField label={t('auth.profile.name')} icon="profile" value={name} onChangeText={setName} maxLength={PROFILE.NAME_MAX} autoFocus inputProps={{ autoCapitalize: 'words', returnKeyType: 'next' }} />
        {askAge ? (
          <View style={styles.gap}>
            <TextField
              label={t('auth.profile.age')}
              icon="calendar-check"
              value={age}
              onChangeText={(v) => setAge(v.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
              error={ageInvalid ? t('errors.VALIDATION_FAILED') : update.error ? t(`errors.${update.error.code}`) : undefined}
            />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: 16 },
});
