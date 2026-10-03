import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';
import { Emoji } from './Emoji';

export interface AvatarProps {
  /** Емодзі-аватар (для членів сім'ї емодзі доречні: 👵 👴 🧑) — показується, поки немає фото */
  symbol: string;
  /** Фото-аватар (підписане посилання з сервера); не завантажилось → емодзі */
  uri?: string | null;
  size?: number;
  tone?: 'paper' | 'dark' | 'gold';
}

const BG = { paper: colors.greenLight, dark: colors.forest, gold: colors.pillGoldBg } as const;
const RING = { paper: colors.greenBorder, dark: colors.forest, gold: colors.pillGoldBorder } as const;

/** Круглий аватар члена сім'ї (`.ava` з макета): фото або емодзі в колі з тонкою рамкою */
export function Avatar({ symbol, uri, size = 56, tone = 'paper' }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = !!uri && failed !== uri;
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: BG[tone], borderColor: RING[tone] }]}>
      {showPhoto ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setFailed(uri)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Emoji symbol={symbol} size={Math.round(size * 0.52)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
});
