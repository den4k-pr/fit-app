import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { PhotosResponse } from '@/types';

/** GET /workouts/records/:recordId/photos (дитина). 410 PHOTOS_DELETED → «Фото видалено». */
export function usePhotoUrls(recordId: string | null): UseQueryResult<PhotosResponse, ApiError> {
  return useQuery<PhotosResponse, ApiError>({
    queryKey: queryKeys.workouts.photos(recordId ?? 'none'),
    queryFn: () => api.workouts.getPhotos(recordId as string),
    enabled: recordId !== null,
    retry: false,
  });
}
