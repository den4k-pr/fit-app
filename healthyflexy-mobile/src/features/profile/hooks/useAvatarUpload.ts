import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/api/gateway';
import { toApiError, type ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import { readLocalPhoto, uploadToPresignedUrl } from '@/services/photos/upload-photos';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types';

/** Аватар: квадрат 400 px, JPEG 70% → ~40–80 КБ (сервер приймає до 512 КБ) */
const AVATAR_SIZE = 400;

/**
 * Тап по аватару → вибір фото з галереї (квадратне кадрування) → стиснення → підписаний PUT → підтвердження.
 * Повертає null, якщо людина передумала (закрила галерею). Фото батька/матері бачить дитина на дашборді.
 */
export function useAvatarUpload(): UseMutationResult<User | null, ApiError, void> {
  const queryClient = useQueryClient();
  return useMutation<User | null, ApiError, void>({
    mutationFn: async () => {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return null;
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });
        if (picked.canceled || !picked.assets[0]) return null;

        const image = await ImageManipulator.manipulate(picked.assets[0].uri)
          .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE })
          .renderAsync();
        const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
        const photo = await readLocalPhoto(saved.uri);

        const target = await api.users.createAvatarUpload(photo.sizeBytes);
        await uploadToPresignedUrl({ url: target.uploadUrl, headers: target.headers, blob: photo.blob, onProgress: () => undefined });
        return await api.users.setAvatar(target.avatarKey);
      } catch (error) {
        throw toApiError(error);
      }
    },
    onSuccess: (user) => {
      if (!user) return;
      useAuthStore.getState().setUser(user);
      queryClient.setQueryData(queryKeys.me, user);
      void queryClient.invalidateQueries({ queryKey: queryKeys.family.all });
    },
  });
}
