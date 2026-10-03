import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createReadStream, createWriteStream, ReadStream } from 'node:fs';
import { mkdir, readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ErrorCode } from '../../../common/constants';
import { AppException } from '../../../common/exceptions/app.exception';
import { hmacSha256Hex, timingSafeEqualHex } from '../../../common/utils/hash.util';
import { AppConfigService } from '../../../config';
import {
  StorageProvider,
  StoredObjectInfo,
  UploadTarget,
  UploadTargetInput,
} from '../storage.types';

export type SignedOperation = 'put' | 'get';

/** Захист від path traversal: приймаємо лише ключі виду `uuid/uuid/uuid/N.jpg` */
/** Кадри вправ `{family}/{session}/{exercise}/{n}.jpg` і фото-аватари `avatars/{user}/{id}.jpg` */
const SAFE_KEY =
  /^([0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/(?:[1-9]|1[0-9]|2[0-4])|avatars\/[0-9a-f-]{36}\/[0-9a-f-]{36})\.jpg$/;

/**
 * Локальне сховище: файли на диску (`STORAGE_LOCAL_DIR`). Працює за тим самим контрактом, що й S3:
 * клієнт отримує підписаний URL (HMAC, з терміном дії) і робить PUT/GET. URL веде на StorageController цього ж API.
 * Для продакшну з кількома інстансами перейдіть на `STORAGE_DRIVER=s3`: код застосунку не змінюється.
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local' as const;
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly root: string;
  private readonly secret: string;
  private readonly objectUrl: string;

  constructor(config: AppConfigService) {
    this.root = resolve(config.get('STORAGE_LOCAL_DIR', { infer: true }));
    this.secret =
      config.get('STORAGE_SIGNING_SECRET', { infer: true }) ??
      config.get('TOKEN_HASH_SECRET', { infer: true });
    const base = config.get('PUBLIC_BASE_URL', { infer: true }).replace(/\/$/, '');
    this.objectUrl = `${base}/${config.get('API_GLOBAL_PREFIX', { infer: true })}/storage/object`;
    this.logger.log(`Local storage root: ${this.root}`);
  }

  createUploadTarget({
    key,
    contentType,
    maxBytes,
    ttlSeconds,
  }: UploadTargetInput): Promise<UploadTarget> {
    return Promise.resolve({
      url: this.signedUrl('put', key, ttlSeconds, maxBytes),
      method: 'PUT',
      headers: { 'Content-Type': contentType },
    });
  }

  createDownloadUrl(key: string, ttlSeconds: number): Promise<string> {
    return Promise.resolve(this.signedUrl('get', key, ttlSeconds, 0));
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    try {
      const info = await stat(this.pathOf(key));
      return { sizeBytes: info.size, contentType: 'image/jpeg' };
    } catch {
      return null;
    }
  }

  async putBytes(key: string, bytes: Buffer): Promise<void> {
    await this.write(key, Readable.from([bytes]), bytes.length);
  }

  readBytes(key: string): Promise<Buffer> {
    return readFile(this.pathOf(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true });
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const dir = this.pathOf(prefix.replace(/\/$/, ''), true);
    const count = await this.countFiles(dir);
    await rm(dir, { recursive: true, force: true });
    return count;
  }

  // ─── лише для StorageController ───

  /** Перевіряє підпис і термін дії підписаного URL (константний час порівняння) */
  verify(op: SignedOperation, key: string, exp: number, max: number, sig: string): void {
    const expected = this.signature(op, key, exp, max);
    const valid =
      /^[0-9a-f]{64}$/.test(sig) && timingSafeEqualHex(expected, sig) && exp * 1000 > Date.now();
    if (!valid) throw new AppException(ErrorCode.STORAGE_SIGNATURE_INVALID, HttpStatus.FORBIDDEN);
  }

  /** Стрім у файл із лімітом розміру; спершу тимчасовий файл, потім атомарний rename */
  async write(key: string, source: Readable, maxBytes: number): Promise<number> {
    const target = this.pathOf(key);
    const temp = `${target}.${process.pid}.tmp`;
    await mkdir(dirname(target), { recursive: true });
    let received = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _enc, done) {
        received += chunk.length;
        if (received > maxBytes)
          done(new AppException(ErrorCode.PHOTO_TOO_LARGE, HttpStatus.PAYLOAD_TOO_LARGE));
        else done(null, chunk);
      },
    });
    try {
      await pipeline(source, limiter, createWriteStream(temp));
      await rename(temp, target);
      return received;
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }
  }

  read(key: string): ReadStream {
    return createReadStream(this.pathOf(key));
  }

  // ─── внутрішнє ───

  private signedUrl(op: SignedOperation, key: string, ttlSeconds: number, max: number): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const sig = this.signature(op, key, exp, max);
    const query = new URLSearchParams({ op, key, exp: String(exp), max: String(max), sig });
    return `${this.objectUrl}?${query.toString()}`;
  }

  private signature(op: SignedOperation, key: string, exp: number, max: number): string {
    return hmacSha256Hex(`${op}\n${key}\n${exp}\n${max}`, this.secret);
  }

  /** Абсолютний шлях усередині root; ключ із «..» або поза шаблоном відхиляється */
  private pathOf(key: string, allowDirectory = false): string {
    const safe = allowDirectory
      ? /^([0-9a-f-]{36}(\/[0-9a-f-]{36}){0,2}|avatars\/[0-9a-f-]{36})$/.test(key)
      : SAFE_KEY.test(key);
    const full = resolve(this.root, key);
    if (!safe || !full.startsWith(this.root + sep)) {
      throw new AppException(ErrorCode.PHOTO_KEY_INVALID, HttpStatus.BAD_REQUEST);
    }
    return full;
  }

  private async countFiles(dir: string): Promise<number> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      const nested = await Promise.all(
        entries.map((e) =>
          e.isDirectory() ? this.countFiles(resolve(dir, e.name)) : Promise.resolve(1),
        ),
      );
      return nested.reduce((a, b) => a + b, 0);
    } catch {
      return 0;
    }
  }
}
