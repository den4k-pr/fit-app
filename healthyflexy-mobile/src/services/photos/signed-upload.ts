import { api } from '@/api/gateway';
import { readLocalPhoto, uploadToPresignedUrl } from './upload-photos';

export interface SignedUploadInput {
  /** file:// URI стиснених кадрів у порядку зйомки */
  fileUris: string[];
  sessionId: string;
  exerciseId: string;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

/**
 * Старий шлях кадрів (запасний: веб-перегляд і сервер без `complete-frames`): прочитати файли → ОДИН запит
 * підписаних URL → PUT кожного кадру → photoKeys для POST .../complete. Прогрес — сумарний по всіх кадрах.
 */
export async function uploadViaSignedUrls({ fileUris, sessionId, exerciseId, onProgress, signal }: SignedUploadInput): Promise<string[]> {
  const photos = await Promise.all(fileUris.map(readLocalPhoto));
  const targets = await api.workouts.createUploadUrl({
    sessionId,
    exerciseId,
    frames: photos.map((p) => ({ contentType: p.contentType, sizeBytes: p.sizeBytes })),
  });
  const progress = new Array<number>(photos.length).fill(0);
  const report = () => onProgress?.(progress.reduce((a, b) => a + b, 0) / photos.length);
  await Promise.all(
    targets.uploads.map((target, i) =>
      uploadToPresignedUrl({
        url: target.uploadUrl,
        headers: target.headers,
        blob: photos[i].blob,
        signal,
        onProgress: (p) => {
          progress[i] = p;
          report();
        },
      }),
    ),
  );
  return targets.uploads.map((t) => t.photoKey);
}
