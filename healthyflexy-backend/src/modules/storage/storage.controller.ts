import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Put,
  Query,
  Req,
  StreamableFile,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { Inject } from '@nestjs/common';
import { ErrorCode, PHOTO, STORAGE_PROVIDER } from '../../common/constants';
import { AppException } from '../../common/exceptions/app.exception';
import { Public } from '../auth/decorators/public.decorator';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { StorageProvider } from './storage.types';

/**
 * Кінцеві точки ЛИШЕ для `STORAGE_DRIVER=local`: приймають і віддають файли за підписаним URL
 * (JWT не потрібен: підпис = дозвіл на одну дію з одним ключем, обмежений у часі).
 * Для S3/R2 контролер відповідає 404, бо клієнт ходить напряму в сховище.
 */
@ApiExcludeController()
@Controller('storage')
export class StorageController {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  @Public()
  @Put('object')
  @HttpCode(HttpStatus.OK)
  async upload(
    @Query('key') key: string,
    @Query('exp') exp: string,
    @Query('max') max: string,
    @Query('sig') sig: string,
    @Headers('content-type') contentType: string | undefined,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    const local = this.local();
    local.verify('put', key ?? '', Number(exp), Number(max), sig ?? '');
    if (
      !contentType ||
      !(PHOTO.ALLOWED_MIME_TYPES as readonly string[]).includes(contentType.split(';')[0].trim())
    ) {
      throw new AppException(ErrorCode.PHOTO_TYPE_NOT_ALLOWED, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }
    await local.write(key, req, Number(max));
    return { success: true };
  }

  @Public()
  @Get('object')
  async download(
    @Query('key') key: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
  ): Promise<StreamableFile> {
    const local = this.local();
    local.verify('get', key ?? '', Number(exp), 0, sig ?? '');
    if (!(await local.head(key))) throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
    return new StreamableFile(local.read(key), { type: 'image/jpeg' });
  }

  private local(): LocalStorageProvider {
    if (!(this.provider instanceof LocalStorageProvider)) throw new NotFoundException();
    return this.provider;
  }
}
