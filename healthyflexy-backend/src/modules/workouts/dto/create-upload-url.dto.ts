import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PHOTO } from '../../../common/constants';

export class PhotoFrameDto {
  @IsIn([...PHOTO.ALLOWED_MIME_TYPES])
  contentType: string;

  /** Розмір стисненого кадру в байтах (≤ 1 МБ; зазвичай ~150 КБ) */
  @IsInt()
  @Min(1)
  @Max(PHOTO.MAX_BYTES)
  sizeBytes: number;
}

/**
 * POST /workouts/uploads: просить підписані URL для завантаження кадрів (1–24) напряму у сховище.
 * Порядок елементів `frames` = порядок кадрів (1…6).
 */
export class CreateUploadUrlDto {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  exerciseId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PHOTO.FRAMES_PER_EXERCISE)
  @ValidateNested({ each: true })
  @Type(() => PhotoFrameDto)
  frames: PhotoFrameDto[];
}
