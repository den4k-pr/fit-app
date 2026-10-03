import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AVATAR, ErrorCode, PHOTO, STORAGE_PROVIDER } from '../../common/constants';
import { AppException } from '../../common/exceptions/app.exception';
import { PhotoKeyParts, StorageProvider, UploadTarget } from './storage.types';

const PHOTO_KEY = /^([0-9a-f-]{36})\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/([1-9]|1[0-9]|2[0-4])\.jpg$/;

export interface PhotoUploadRequest {
  contentType: string;
  sizeBytes: number;
}

export interface PhotoUploadResult extends UploadTarget {
  photoKey: string;
}

/**
 * Доменний фасад над сховищем: знає ключі кадрів і правила (до 24 кадрів, ≤ 1 МБ, JPEG, 7 днів),
 * але не знає, ЩО за сховище під ним (диск чи S3): це вирішує STORAGE_PROVIDER.
 */
@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  get driver(): 'local' | 's3' {
    return this.provider.name;
  }

  buildPhotoKey({ familyId, sessionId, exerciseId, index }: PhotoKeyParts): string {
    return `${familyId}/${sessionId}/${exerciseId}/${index}.jpg`;
  }

  parsePhotoKey(key: string): PhotoKeyParts | null {
    const m = PHOTO_KEY.exec(key);
    return m ? { familyId: m[1], sessionId: m[2], exerciseId: m[3], index: Number(m[4]) } : null;
  }

  /** Підписані URL для кадрів 1..N (порядок = порядок `frames`) */
  createPhotoUploads(
    parts: Omit<PhotoKeyParts, 'index'>,
    frames: PhotoUploadRequest[],
  ): Promise<PhotoUploadResult[]> {
    return Promise.all(
      frames.map(async (frame, i) => {
        const photoKey = this.buildPhotoKey({ ...parts, index: i + 1 });
        const target = await this.provider.createUploadTarget({
          key: photoKey,
          contentType: frame.contentType,
          sizeBytes: frame.sizeBytes,
          maxBytes: PHOTO.MAX_BYTES,
          ttlSeconds: PHOTO.UPLOAD_URL_TTL_SECONDS,
        });
        return { photoKey, ...target };
      }),
    );
  }

  /**
   * Кадри, що прийшли в самому запиті (multipart): перевіряє тип/розмір і записує як 1..N.
   * Повертає ключі в тому ж порядку. Запис паралельний.
   */
  async putPhotos(
    parts: Omit<PhotoKeyParts, 'index'>,
    frames: { buffer: Buffer; mimetype: string }[],
  ): Promise<string[]> {
    if (frames.length > PHOTO.FRAMES_PER_EXERCISE)
      throw new AppException(ErrorCode.PHOTO_KEY_INVALID, HttpStatus.UNPROCESSABLE_ENTITY);
    for (const frame of frames) {
      if (!(PHOTO.ALLOWED_MIME_TYPES as readonly string[]).includes(frame.mimetype))
        throw new AppException(ErrorCode.PHOTO_TYPE_NOT_ALLOWED, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      if (frame.buffer.length <= 0 || frame.buffer.length > PHOTO.MAX_BYTES)
        throw new AppException(ErrorCode.PHOTO_TOO_LARGE, HttpStatus.PAYLOAD_TOO_LARGE);
    }
    const keys = frames.map((_f, i) => this.buildPhotoKey({ ...parts, index: i + 1 }));
    await Promise.all(
      frames.map((frame, i) => this.provider.putBytes(keys[i], frame.buffer, frame.mimetype)),
    );
    return keys;
  }

  /**
   * Перед зарахуванням: ключі належать саме цій вправі, йдуть підряд 1..N, і файли справді є в сховищі.
   * Інакше PHOTO_KEY_INVALID (клієнт не може «зарахувати» чужі або неіснуючі кадри).
   * Перевірка наявності — паралельно (на S3 це 24 HEAD-запити: послідовно ~0,5 с).
   */
  async assertPhotosUploaded(parts: Omit<PhotoKeyParts, 'index'>, keys: string[]): Promise<void> {
    for (const [i, key] of keys.entries()) {
      if (key !== this.buildPhotoKey({ ...parts, index: i + 1 })) {
        throw new AppException(ErrorCode.PHOTO_KEY_INVALID, HttpStatus.UNPROCESSABLE_ENTITY);
      }
    }
    const infos = await Promise.all(keys.map((key) => this.provider.head(key)));
    if (infos.some((info) => !info || info.sizeBytes <= 0 || info.sizeBytes > PHOTO.MAX_BYTES)) {
      throw new AppException(
        ErrorCode.PHOTO_KEY_INVALID,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Photo not uploaded',
      );
    }
  }

  /** Вміст кадрів (у тому ж порядку) — для розкадровки AI */
  readPhotos(keys: string[]): Promise<Buffer[]> {
    return Promise.all(keys.map((key) => this.provider.readBytes(key)));
  }

  createPhotoDownloadUrls(keys: string[]): Promise<string[]> {
    return Promise.all(
      keys.map((key) => this.provider.createDownloadUrl(key, PHOTO.VIEW_URL_TTL_SECONDS)),
    );
  }

  async deleteKeys(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.provider.delete(key)));
  }

  // ───── фото-аватари ─────

  /** Підписаний PUT для нового аватара: ключ `avatars/{userId}/{випадковий}.jpg` */
  async createAvatarUpload(userId: string, sizeBytes: number): Promise<PhotoUploadResult> {
    const key = `avatars/${userId}/${randomUUID()}.jpg`;
    const target = await this.provider.createUploadTarget({
      key,
      contentType: 'image/jpeg',
      sizeBytes,
      maxBytes: AVATAR.MAX_BYTES,
      ttlSeconds: PHOTO.UPLOAD_URL_TTL_SECONDS,
    });
    return { photoKey: key, ...target };
  }

  /** Ключ належить саме цьому користувачу й файл справді завантажено */
  async assertAvatarUploaded(userId: string, key: string): Promise<void> {
    const own = new RegExp(`^avatars/${userId}/[0-9a-f-]{36}\\.jpg$`).test(key);
    const info = own ? await this.provider.head(key) : null;
    if (!info || info.sizeBytes <= 0 || info.sizeBytes > AVATAR.MAX_BYTES) {
      throw new AppException(ErrorCode.PHOTO_KEY_INVALID, HttpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  avatarUrl(key: string | null): Promise<string | null> {
    return key
      ? this.provider.createDownloadUrl(key, AVATAR.VIEW_URL_TTL_SECONDS)
      : Promise.resolve(null);
  }

  deleteUserAvatars(userId: string): Promise<number> {
    return this.provider.deleteByPrefix(`avatars/${userId}/`);
  }

  /** Видалення акаунта: усе, що належить сім'ї */
  deleteFamilyFiles(familyId: string): Promise<number> {
    return this.provider.deleteByPrefix(`${familyId}/`);
  }
}
