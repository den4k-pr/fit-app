import { AppText } from './AppText';

export interface EmojiProps {
  symbol: string;
  size?: number;
}

/** Емодзі фіксованого розміру; для скрін-рідерів приховане (не замінює підписи — ТЗ §17) */
export function Emoji({ symbol, size = 20 }: EmojiProps) {
  return (
    <AppText decorative style={{ fontSize: size, lineHeight: Math.round(size * 1.25) }}>
      {symbol}
    </AppText>
  );
}
