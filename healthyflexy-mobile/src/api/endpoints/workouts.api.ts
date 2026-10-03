import { apiClient } from '../client';
import type {
  Calendar,
  CalendarQuery,
  CompleteExerciseRequest,
  CompleteExerciseResponse,
  CreateUploadUrlRequest,
  DayDetail,
  ISODate,
  PhotosResponse,
  PlannedDay,
  Today,
  UploadUrlResponse,
} from '@/types';

/** Зарахування з AI-перевіркою кадрів */
const AI_REQUEST_TIMEOUT_MS = 60_000;
/** Кадри (до ~1 МБ сумарно) + AI-перевірка в одному запиті */
const UPLOAD_REQUEST_TIMEOUT_MS = 90_000;

export const workoutsApi = {
  getToday: () => apiClient.get<Today>('/workouts/today').then((r) => r.data),
  createUploadUrl: (body: CreateUploadUrlRequest) =>
    apiClient.post<UploadUrlResponse>('/workouts/uploads', body).then((r) => r.data),
  completeExercise: (sessionId: string, exerciseId: string, body: CompleteExerciseRequest) =>
    apiClient
      .post<CompleteExerciseResponse>(
        `/workouts/${sessionId}/exercises/${exerciseId}/complete`,
        body,
        // AI-перевірка кадрів іде синхронно в цьому запиті — звичайних 15 с може не вистачити
        { timeout: AI_REQUEST_TIMEOUT_MS },
      )
      .then((r) => r.data),
  /**
   * Кадри + зарахування ОДНИМ multipart-запитом (раніше: «uploads» + 24 PUT + «complete» — на мобільному
   * інтернеті кожен обмін із сервером це ~0,2–0,5 с, а Android паралельно шле лише 5 запитів на хост).
   */
  completeWithFrames: (
    sessionId: string,
    exerciseId: string,
    input: { fileUris: string[]; frameTimes?: number[]; onProgress?: (progress: number) => void },
  ) => {
    const form = new FormData();
    if (input.frameTimes) form.append('frameTimes', JSON.stringify(input.frameTimes));
    input.fileUris.forEach((uri, i) => {
      // React Native: файл з диска без читання в пам'ять JS
      form.append('frames', { uri, name: `${i + 1}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    });
    return apiClient
      .post<CompleteExerciseResponse>(`/workouts/${sessionId}/exercises/${exerciseId}/complete-frames`, form, {
        // без явного multipart axios перетворив би FormData на JSON; межу (boundary) додає мережевий шар RN
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_REQUEST_TIMEOUT_MS,
        onUploadProgress: (event) => {
          if (event.total) input.onProgress?.(event.loaded / event.total);
        },
      })
      .then((r) => r.data);
  },
  /** Пропустити вправу без оплати (не вдалася / не зарахована); інші вправи дня лишаються доступними */
  skipExercise: (sessionId: string, exerciseId: string) =>
    apiClient
      .post<CompleteExerciseResponse>(`/workouts/${sessionId}/exercises/${exerciseId}/skip`)
      .then((r) => r.data),
  getCalendar: (query: CalendarQuery) =>
    apiClient.get<Calendar>('/workouts/calendar', { params: query }).then((r) => r.data),
  /** Дні із записом у проміжку (до 31 дня), від найновішого — один запит замість запиту на кожен день */
  getDaysDetail: (from: ISODate, to: ISODate) =>
    apiClient.get<DayDetail[]>('/workouts/days', { params: { from, to } }).then((r) => r.data),
  getDayDetail: (date: ISODate) =>
    apiClient.get<DayDetail>(`/workouts/days/${date}`).then((r) => r.data),
  /** Склад дня з «Програми тренувань» (календар) */
  getPlannedDay: (date: ISODate) =>
    apiClient.get<PlannedDay>(`/workouts/plan/${date}`).then((r) => r.data),
  getPhotos: (recordId: string) =>
    apiClient.get<PhotosResponse>(`/workouts/records/${recordId}/photos`).then((r) => r.data),
};
