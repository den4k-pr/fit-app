import { Share } from 'react-native';

/** Системне меню «Поділитися» (текст із кодом запрошення) */
export async function shareText(message: string): Promise<void> {
  await Share.share({ message });
}
