import { PHOTO } from '@/constants/limits';

export interface LocalPhoto {
  blob: Blob;
  sizeBytes: number;
  contentType: string;
}

/** Читає стиснений кадр (file://): розмір потрібен для підписаного URL (≤ 1 МБ, image/jpeg) */
export async function readLocalPhoto(fileUri: string): Promise<LocalPhoto> {
  const blob = await (await fetch(fileUri)).blob();
  return { blob, sizeBytes: blob.size, contentType: PHOTO.ALLOWED_MIME_TYPES[0] };
}

export interface UploadOptions {
  url: string;
  headers: Record<string, string>;
  blob: Blob;
  onProgress: (progress: number) => void;
  signal?: AbortSignal;
}

const UPLOAD_TIMEOUT_MS = 60_000;

/** `https://host/шлях` без підпису (query): безпечно показувати в логах */
const targetOf = (url: string): string => /^(https?:\/\/[^/?]+[^?]*)/.exec(url)?.[1] ?? url.slice(0, 60);

/** dev: у консолі Metro видно, куди саме пішов PUT і чому він не вдався */
function logUploadFailure(url: string, reason: string): void {
  if (!__DEV__) return;
  console.warn(`[upload] PUT ${targetOf(url)} → ${reason}`);
}

/**
 * PUT файла у підписаний URL із прогресом 0–1. Однаково працює для локального сховища сервера й для S3/R2.
 * XMLHttpRequest — єдиний спосіб отримати upload.onprogress у React Native.
 */
export function uploadToPresignedUrl({ url, headers, blob, onProgress, signal }: UploadOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Адреса без https:// (помилкова PUBLIC_BASE_URL на сервері) не відкриється взагалі: кажемо про це прямо
    if (!/^https?:\/\//i.test(url)) {
      logUploadFailure(url, 'НЕКОРЕКТНА АДРЕСА (немає http/https). Перевірте PUBLIC_BASE_URL на сервері');
      reject(new Error('Invalid upload URL'));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      logUploadFailure(url, `HTTP ${xhr.status} ${String(xhr.responseText).slice(0, 160)}`);
      reject(new Error(`Upload failed: ${xhr.status}`));
    };
    xhr.onerror = () => {
      logUploadFailure(url, `НЕМАЄ ЗВ'ЯЗКУ з цією адресою (телефон не бачить сервер або адреса неправильна)`);
      reject(new Error('Network error'));
    };
    xhr.ontimeout = () => {
      logUploadFailure(url, `таймаут ${UPLOAD_TIMEOUT_MS / 1000} с`);
      reject(new Error('Upload timeout'));
    };
    signal?.addEventListener('abort', () => {
      xhr.abort();
      reject(new Error('Aborted'));
    });
    xhr.send(blob);
  });
}
