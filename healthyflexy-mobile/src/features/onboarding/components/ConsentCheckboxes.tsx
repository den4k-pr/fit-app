import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { LEGAL_URLS } from '@/constants/legal';
import { AppText } from '@/shared/ui/AppText';
import { Checkbox } from '@/shared/ui/Checkbox';

export interface ConsentState {
  terms: boolean;
  disclaimer: boolean;
  doctor: boolean;
}

export interface ConsentCheckboxesProps {
  value: ConsentState;
  onChange: (value: ConsentState) => void;
}

/** Три обов'язкові згоди (ТЗ §5.2): умови й приватність, не медична рекомендація, консультація з лікарем */
export function ConsentCheckboxes({ value, onChange }: ConsentCheckboxesProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Checkbox checked={value.disclaimer} onChange={(disclaimer) => onChange({ ...value, disclaimer })} label={t('consent.disclaimerLabel')} />
      <Checkbox
        checked={value.terms}
        onChange={(terms) => onChange({ ...value, terms })}
        label={
          <View>
            <AppText variant="small" color="soft">{t('consent.termsLabel')}</AppText>
            <View style={styles.links}>
              <Pressable accessibilityRole="link" hitSlop={10} style={styles.linkBox} onPress={() => void Linking.openURL(LEGAL_URLS.terms)}>
                <AppText variant="smallStrong" color="teal" style={styles.link}>{t('consent.termsLink')}</AppText>
              </Pressable>
              <Pressable accessibilityRole="link" hitSlop={10} style={styles.linkBox} onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}>
                <AppText variant="smallStrong" color="teal" style={styles.link}>{t('consent.privacyLink')}</AppText>
              </Pressable>
            </View>
          </View>
        }
      />
      <Checkbox checked={value.doctor} onChange={(doctor) => onChange({ ...value, doctor })} label={t('consent.doctorLabel')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  // посилання — кожне своїм рядком і не ширші за колонку (довга «Политика конфиденциальности» не вилазить за картку)
  links: { gap: 6, marginTop: 4 },
  linkBox: { alignSelf: 'flex-start', maxWidth: '100%' },
  link: { textDecorationLine: 'underline', flexShrink: 1 },
});
