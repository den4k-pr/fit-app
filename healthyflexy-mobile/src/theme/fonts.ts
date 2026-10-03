import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import { useFonts } from 'expo-font';

/** Один шрифт на весь застосунок — Montserrat. `loaded === false` → тримаємо splash (див. app/_layout.tsx). */
export function useAppFonts(): { loaded: boolean; error: Error | null } {
  const [loaded, error] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });
  return { loaded, error };
}
