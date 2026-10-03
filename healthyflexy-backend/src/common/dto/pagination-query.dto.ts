import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PAGINATION } from '../constants';

/** Курсорна пагінація (журнал розрахунків). */
export class PaginationQueryDto {
  /** Непрозорий курсор із попередньої відповіді (`nextCursor`) */
  @IsOptional()
  @IsString()
  cursor?: string;

  /** Розмір сторінки (1–50, за замовчуванням 20) */
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_LIMIT)
  limit: number = PAGINATION.DEFAULT_LIMIT;
}
