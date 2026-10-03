import { Trans } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/shared/ui/Icon';
import { colors, fonts, radius, typography } from '@/theme';

/** «Виконайте всі вправи й заробіть €5»: золота плашка з монетами (`--gold-bg` з макета) */
export function EarnBanner({ amountLabel }: { amountLabel: string }) {
  return (
    <View style={styles.banner}>
      <Icon name="coins" size={22} color="goldDark" />
      <Text style={styles.text}>
        <Trans i18nKey="today.earnBanner" values={{ amount: amountLabel }} components={{ b: <Text style={styles.bold} /> }} />
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.pillGoldBg, borderColor: colors.pillGoldBorder, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8 },
  text: { ...typography.small, color: colors.pillGoldText, flex: 1 },
  bold: { fontFamily: fonts.sansBold, color: colors.pillGoldText },
});
