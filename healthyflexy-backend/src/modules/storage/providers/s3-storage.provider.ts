import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../../config';
import {
  StorageProvider,
  StoredObjectInfo,
  UploadTarget,
  UploadTargetInput,
} from '../storage.types';

/**
 * S3-сумісне сховище: AWS S3, Cloudflare R2 (`S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`, регіон `auto`),
 * MinIO. Bucket приватний; клієнт завантажує/читає лише за підписаними URL, файли через API не проходять.
 * Автовидалення можна дублювати політикою бакета (lifecycle: delete after 7 days).
 */
@Injectable()
export class S3StorageProvider implements StorageProvider {
  readonly name = 's3' as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: AppConfigService) {
    this.bucket = config.get('S3_BUCKET_PHOTOS', { infer: true }) ?? '';
    const accessKeyId = config.get('S3_ACCESS_KEY_ID', { infer: true });
    const secretAccessKey = config.get('S3_SECRET_ACCESS_KEY', { infer: true });
    this.client = new S3Client({
      region: config.get('S3_REGION', { infer: true }),
      endpoint: config.get('S3_ENDPOINT', { infer: true }) || undefined,
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });
  }

  async createUploadTarget({
    key,
    contentType,
    sizeBytes,
    ttlSeconds,
  }: UploadTargetInput): Promise<UploadTarget> {
    // ContentLength у підписі: сховище відхилить файл, розмір якого не збігається із заявленим
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: sizeBytes,
      }),
      { expiresIn: ttlSeconds },
    );
    return { url, method: 'PUT', headers: { 'Content-Type': contentType } };
  }

  createDownloadUrl(key: string, ttlSeconds: number): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: ttlSeconds,
    });
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    try {
      const out = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { sizeBytes: out.ContentLength ?? 0, contentType: out.ContentType ?? null };
    } catch {
      return null;
    }
  }

  async putBytes(key: string, bytes: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    );
  }

  async readBytes(key: string): Promise<Buffer> {
    const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!out.Body) throw new Error(`Empty object: ${key}`);
    return Buffer.from(await out.Body.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let deleted = 0;
    let token: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
      if (keys.length > 0) {
        await this.client.send(
          new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys } }),
        );
        deleted += keys.length;
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return deleted;
  }
}
