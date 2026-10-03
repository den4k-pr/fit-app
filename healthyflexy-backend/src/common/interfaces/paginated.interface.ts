export interface CursorPage<T> {
  items: T[];
  /** null — сторінок більше немає */
  nextCursor: string | null;
}

/** Розкодований курсор: createdAt + id (стабільне сортування) */
export interface DecodedCursor {
  createdAt: string;
  id: string;
}
