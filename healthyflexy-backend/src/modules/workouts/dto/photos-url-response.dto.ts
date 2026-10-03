export class PhotoViewDto {
  /** 1–24: порядок кадрів у вправі */
  index: number;

  /** Підписаний GET-URL, діє 1 годину */
  url: string;
}

export class AttemptSummaryDto {
  score: number;
  feedback: string;
  recommendations: string;
}

/**
 * GET /workouts/records/:recordId/photos: лише role=child.
 * Кадри видалено → 410 PHOTOS_DELETED; кадрів не було → 404 PHOTOS_NOT_AVAILABLE.
 */
export class PhotosUrlResponseDto {
  photos: PhotoViewDto[];
  expiresInSeconds: number;
  /** Результат AI-аналізу цієї спроби (null — вправу зараховано без фото, до AI-модуля, або AI вимкнено) */
  attempt: AttemptSummaryDto | null;
}
