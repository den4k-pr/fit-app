import { ExerciseRecordResponseDto } from './dto';
import { DaySessionResponseDto } from './dto/day-session-response.dto';
import { DaySession } from './entities/day-session.entity';
import { ExerciseRecord } from './entities/exercise-record.entity';

export const toSessionResponse = (s: DaySession): DaySessionResponseDto => ({
  id: s.id,
  date: s.date,
  status: s.status,
  exercisesTotal: s.exercisesTotal,
  exercisesDone: s.exercisesDone,
  rate: s.rate,
  earned: s.earned,
  completedAt: s.completedAt,
});

/** `photosDeleted` = кадри були, але видалені (purge) або термін зберігання вже спливув */
export function toRecordResponse(
  record: ExerciseRecord,
  exerciseName: string,
  exerciseSlug: string,
  now: Date = new Date(),
): ExerciseRecordResponseDto {
  const hadPhotos = record.photoKeys.length > 0;
  const expired = hadPhotos && record.photosExpiresAt !== null && record.photosExpiresAt <= now;
  return {
    id: record.id,
    sessionId: record.sessionId,
    exerciseId: record.exerciseId,
    exerciseSlug,
    exerciseName,
    photoCount: record.photoKeys.length,
    steps: record.steps ?? null,
    photosExpiresAt: record.photosExpiresAt,
    photosDeleted: hadPhotos && (record.photosDeletedAt !== null || expired),
    completedAt: record.completedAt,
    skipped: record.skipped ?? false,
  };
}
