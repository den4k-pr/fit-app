import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { LANGUAGES_DISPLAY_ORDER, LANGUAGE_LABEL } from '@/constants/languages';
import { ROUTES } from '@/constants/routes';
import { setAppLanguage } from '@/i18n';
import { LogoMark } from '@/shared/components/LogoMark';
import { Reveal } from '@/shared/motion';
import { AppText } from '@/shared/ui/AppText';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { Screen } from '@/shared/ui/Screen';
import { SelectTile } from '@/shared/ui/SelectTile';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useSettingsStore } from '@/store/settings.store';
import { AppLanguage } from '@/types';

/** Підпис «Оберіть мову» кожною мовою: людина ще не обрала мову, тому бачить запрошення рідною */
const CHOOSE: Record<AppLanguage, string> = {
  [AppLanguage.Uk]: 'Оберіть мову',
  [AppLanguage.Ru]: 'Выберите язык',
  [AppLanguage.Pl]: 'Wybierz język',
  [AppLanguage.En]: 'Choose your language',
};

/**
 * Найперший екран застосунку: вибір мови ДО згод, онбордингу й входу. Мова застосовується одразу (наступні екрани
 * вже нею), запам'ятовується на пристрої, а після входу йде в профіль (session.ts бере languageOverride).
 */
export function LanguageSelectScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [picked, setPicked] = useState<AppLanguage | null>(null);
  const current = (picked ?? i18n.language) as AppLanguage;

  const choose = (language: AppLanguage) => {
    setPicked(language);
    void setAppLanguage(language);
    useSettingsStore.getState().setLanguageOverride(language);
  };

  return (
    <Screen
      bottomInset
      footer={
        <Button
          label={t('common.continue')}
          iconRight="arrow-right"
          disabled={!picked}
          onPress={() => {
            useOnboardingStore.getState().markLanguageChosen();
            router.replace(ROUTES.consent);
          }}
        />
      }
    >
      <Reveal>
        <View style={styles.head}>
          <LogoMark size={56} />
          <View style={styles.globe}>
            <Icon name="globe" size={20} color="forest" />
            <AppText variant="h1" color="forest" align="center">{CHOOSE[current] ?? CHOOSE[AppLanguage.En]}</AppText>
          </View>
          <AppText variant="small" color="muted" align="center">
            {LANGUAGES_DISPLAY_ORDER.map((l) => CHOOSE[l]).filter((x) => x !== CHOOSE[current]).join(' · ')}
          </AppText>
        </View>
      </Reveal>
      <Reveal>
        <View style={styles.grid}>
          {LANGUAGES_DISPLAY_ORDER.map((language) => {
            const selected = picked === language;
            return (
              <SelectTile
                key={language}
                selected={selected}
                showCheck
                accessibilityLabel={LANGUAGE_LABEL[language]}
                onPress={() => choose(language)}
                style={styles.cell}
                innerStyle={styles.tile}
              >
                <AppText variant="bodyStrong" color={selected ? 'forest' : 'soft'}>{LANGUAGE_LABEL[language]}</AppText>
              </SelectTile>
            );
          })}
        </View>
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  globe: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, justifyContent: 'space-between' },
  cell: { width: '48%' },
  tile: { minHeight: 72 },
});
