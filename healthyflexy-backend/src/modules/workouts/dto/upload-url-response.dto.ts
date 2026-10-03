export class PhotoUploadTargetDto {
  /** Передати в POST .../complete у `photoKeys` (в тому ж порядку) */
  photoKey: string;

  /** Підписаний PUT-URL: локальне сховище (dev) або S3/R2 напряму. Клієнт не знає різниці */
  uploadUrl: string;
  method: 'PUT';

  /** Обов'язкові заголовки PUT-запиту (Content-Type) */
  headers: Record<string, string>;
}

export class UploadUrlResponseDto {
  uploads: PhotoUploadTargetDto[];
  expiresInSeconds: number;
  maxBytes: number;
}
