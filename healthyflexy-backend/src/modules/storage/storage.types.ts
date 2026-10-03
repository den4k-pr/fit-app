/** Складові ключа кадру: `{familyId}/{sessionId}/{exerciseId}/{index}.jpg` (index 1–24) */
export interface PhotoKeyParts {
  familyId: string;
  sessionId: string;
  exerciseId: string;
  index: number;
}

export interface UploadTargetInput {
  key: string;
  contentType: string;
  /** Точний розмір, який заявив клієнт (S3 підписує його; локальне сховище перевіряє ≤ maxBytes) */
  sizeBytes: number;
  maxBytes: number;
  ttlSeconds: number;
}

/** Куди й як клієнт завантажує файл. Вигляд однаковий для local і S3/R2: клієнту байдуже, що за сховище */
export interface UploadTarget {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
}

/** Метадані об'єкта (HEAD): перевірка, що файл справді завантажено */
export interface StoredObjectInfo {
  sizeBytes: number;
  contentType: string | null;
}

/**
 * ПОРТ сховища. Реалізації: LocalStorageProvider (диск), S3StorageProvider (AWS S3 / Cloudflare R2).
 * Додати нове сховище (Azure, GCS…) = написати клас із цими методами й додати гілку у storage.module.ts.
 */
export interface StorageProvider {
  readonly name: 'local' | 's3';
  createUploadTarget(input: UploadTargetInput): Promise<UploadTarget>;
  createDownloadUrl(key: string, ttlSeconds: number): Promise<string>;
  head(key: string): Promise<StoredObjectInfo | null>;
  /** Запис файлу сервером (пакетне завантаження кадрів одним запитом замість підписаних PUT) */
  putBytes(key: string, bytes: Buffer, contentType: string): Promise<void>;
  /** Вміст файлу (сервер складає з кадрів розкадровку для AI) */
  readBytes(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** Повертає кількість видалених об'єктів */
  deleteByPrefix(prefix: string): Promise<number>;
}
