import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PHOTO, STEPS } from '../../../common/constants';

/**
 * POST /workouts/:sessionId/exercises/:exerciseId/complete: лише role=parent.
 * Параметри шляху валідуються ParseUUIDPipe.
 */
export class CompleteExerciseDto {
  /**
   * Ключі завантажених кадрів (з UploadUrlResponseDto), до 6 шт.
   * Вправа з камерою вимагає щонайменше PHOTO.MIN_FRAMES_FOR_ANALYSIS кадрів — зарахування «без фото» немає.
   * Вправа на кроки: порожній масив + `steps`.
   */
  @IsArray()
  @ArrayMaxSize(PHOTO.FRAMES_PER_EXERCISE)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  photoKeys: string[];

  /**
   * Секунда вправи, на якій зроблено кожен кадр (та сама довжина, що й photoKeys). Потрібна, щоб AI
   * пояснив відмову за часом («з 8-ї по 12-ту секунду — ноги не піднімалися»). Без неї — рівномірно.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PHOTO.FRAMES_PER_EXERCISE)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(600, { each: true })
  frameTimes?: number[];

  /** Лише для вправ на кроки: скільки кроків нарахував крокомір телефона за час вправи */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(STEPS.MAX_PER_EXERCISE)
  steps?: number;
}
