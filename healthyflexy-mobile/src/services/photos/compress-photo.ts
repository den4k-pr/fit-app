import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { PHOTO } from '@/constants/limits';

/**
 * Стискає кадр камери перед відправкою: ширина 720 px, JPEG 60% → ~100–200 КБ (сервер не приймає > 1 МБ).
 * Оригінал (кілька МБ) нікуди не йде й видаляється системою разом із кешем.
 */
export async function compressPhoto(uri: string): Promise<string> {
  const image = await ImageManipulator.manipulate(uri).resize({ width: PHOTO.TARGET_WIDTH }).renderAsync();
  const saved = await image.saveAsync({ compress: PHOTO.JPEG_QUALITY, format: SaveFormat.JPEG });
  return saved.uri;
}
