import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PHOTO } from '../../../common/constants';

/**
 * POST /workouts/:sessionId/exercises/:exerciseId/complete-frames (multipart/form-data):
 * файли `frames` (JPEG, 1–24, у порядку зйомки) + необов'язкове поле `frameTimes` — JSON-масив секунд.
 * Один запит замість «uploads» + 24 PUT + «complete»: на мобільному інтернеті це секунди.
 */
export class CompleteWithFramesDto {
  @IsOptional()
  // у multipart поле приходить рядком: «[0,1,2,…]»
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  })
  @IsArray()
  @ArrayMaxSize(PHOTO.FRAMES_PER_EXERCISE)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(600, { each: true })
  frameTimes?: number[];
}
