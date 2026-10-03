# Healthyflexy backend («Книжка турботи»)

REST + WebSocket API для сімейного застосунку, де дорослі діти виплачують батькам (50+) винагороду за щоденні вправи.
Специфікація продукту: `Healthyflexy_TZ_v3_MVP.md` (розділи 8, 12–14 — бізнес-логіка та модель даних).

| | |
|---|---|
| Фреймворк | NestJS 12 (CommonJS-проєкт, `require(esm)` для пакетів Nest) |
| Мова | TypeScript 6 (`strict`), Node ≥ 22.22.3 (у Docker — 24) |
| БД | PostgreSQL 15+ (Railway), TypeORM 0.3.31, snake_case-схема, міграції |
| Auth | Номер телефону → SMS OTP → JWT (15 хв) + refresh-токен з ротацією (30 днів) |
| Файли | **Лише 3 кадри на вправу (відео ніде не зберігається)**. Сховище змінне: `STORAGE_DRIVER=local` (диск) ↔ `s3` (AWS S3 / Cloudflare R2). Підписані URL, кадри видаляються через 7 днів |
| Realtime | socket.io (`/realtime`), кімнати `family:{id}` і `user:{id}` |
| Push | Expo Push (`expo-server-sdk`) |
| Фонові задачі | `@nestjs/schedule` (закриття пропущених днів, чистка відео) |
| Документація API | Swagger на `/docs` (вимикається `SWAGGER_ENABLED=false`) |

## Статус

Уся бізнес-логіка ТЗ реалізована й перевірена наскрізним тестом на реальній PostgreSQL (29 сценаріїв, `npm test`).

| Шар | Стан |
|---|---|
| Схема БД (9 таблиць, CHECK, каскади), міграції `InitSchema` + `PhotosInsteadOfVideo` (up → down → up, `migration:generate` = «No changes») | ✅ |
| Auth за ТЗ §5.4 (**без паролів**): вхід за номером + SMS-код (cooldown 60 с, ≤ 5 спроб, HMAC-хеш, одноразовість), JWT (15 хв) + refresh (30 днів) з ротацією та виявленням повторного використання, вихід і «вийти на всіх пристроях», SMS лише на дозволені країни (`SMS_ALLOWED_COUNTRIES`, антишахрайство), Twilio / Console (код у логу для розробки) | ✅ |
| Користувачі: профіль, згода, роль (один раз), push-токен, видалення акаунта (GDPR: БД + файли + подія) | ✅ |
| Сім'я: запрошення (код, 7 днів, знецінення попередніх), приєднання, план (діє з наступного дня), стан батька/матері, нагадування 1 раз / 2 год (атомарно) | ✅ |
| Вправи й дні: «Сьогодні», послідовність, 3 кадри, `complete` (FOR UPDATE, ідемпотентність, один earn на день), календар, статистика, серія, закриття пропущених днів | ✅ |
| Облік: журнал із курсором, «переказ зроблено» (межі, блокування рядка сім'ї), підтвердження/відхилення | ✅ |
| Сховище кадрів: порт `StorageProvider`, `LocalStorageProvider`, `S3StorageProvider` (S3/R2) | ✅ local перевірено; S3-провайдер компілюється й підписує URL, живий бакет не перевірявся |
| Push (Expo), realtime (socket.io), cron (закриття днів, чистка кадрів/OTP/токенів, advisory-lock) | ✅ |
| Логування: JSON-логи з `requestId`, аудит грошових/сімейних подій, єдиний формат помилок | ✅ |

Перевірено: `tsc`, `nest build`, eslint (0 помилок), 27 e2e-сценаріїв, запуск `dist/main.js`, WebSocket (відхилення поганого токена, доставка подій).

## Швидкий старт

```bash
nvm use                      # Node 24
npm ci
cp .env.example .env         # заповнити DATABASE_URL, JWT_ACCESS_SECRET, TOKEN_HASH_SECRET (сховище за замовчуванням локальне: ./storage)

# локальний PostgreSQL
docker run -d --name hf-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=healthyflexy postgres:17

npm run migration:run        # схема
npm run seed                 # 4 стартові вправи (ідемпотентно)
npm run start:dev            # http://localhost:3000/health  ·  /docs
```

Секрети: `openssl rand -base64 48` (для `JWT_ACCESS_SECRET` і `TOKEN_HASH_SECRET` — різні значення).
У dev `SMS_PROVIDER=console` / `EMAIL_PROVIDER=console` друкують код у лог (у production консольні провайдери відмовляють); тестових номерів/адрес із фіксованим кодом немає
(у `NODE_ENV=production` ігноруються).

## Міграції

```bash
npm run migration:generate -- src/database/migrations/<Назва>   # після зміни entity
npm run migration:run | migration:revert | migration:show
```

`synchronize` вимкнений завжди. Після зміни entity — генеруйте міграцію й **читайте її перед комітом**.
Відома особливість TypeORM: якщо один enum-тип використовують дві таблиці (`relationship_type`, `currency_code`),
згенерована міграція створює його двічі — дублікат `CREATE TYPE`/`DROP TYPE` треба вручну прибрати
(у `InitSchema` це вже зроблено).

## Деплой на Railway

Покрокова інструкція, змінні, Volume для кадрів, налаштування Twilio та таблиця «що означає рядок у логах»: **`docs/RAILWAY.md`**.
Міграції й початкові вправи виконуються самі при старті контейнера.

## Структура

```
src/
├─ main.ts · app.module.ts
├─ config/            env.validation.ts (усі змінні оточення, валідація при старті)
├─ database/          data-source.ts (CLI) · typeorm.options.ts · base.entity.ts · transformers/ · migrations/ · seeds/
├─ common/
│  ├─ enums/          UserRole, RelationshipType, SessionStatus, LedgerType, LedgerStatus, …
│  ├─ constants/      app.constants.ts (OTP, VIDEO, PLAN, …) · error-codes.ts · regex.constants.ts
│  ├─ interfaces/     AuthenticatedUser, JwtAccessPayload, CursorPage
│  ├─ events/         domain-events.ts (події для notifications/realtime)
│  ├─ dto/ · validators/ · types/ · exceptions/ · filters/ · interceptors/ · utils/
└─ modules/
   ├─ auth/           OTP + токени, guards, декоратори @Public / @Roles / @CurrentUser
   ├─ users/          профіль, роль, згода, push-токен, видалення акаунта (GDPR)
   ├─ families/       сім'я, план, запрошення, статус батька, нагадування
   ├─ exercises/      довідник вправ
   ├─ workouts/       день, виконання вправ (транзакція), календар, статистика, відео-кліпи
   ├─ ledger/         облік: earn / settlement, баланс
   ├─ storage/        S3 (підписані URL)
   ├─ sms/            Twilio / Console
   ├─ notifications/  Expo push + шаблони
   ├─ realtime/       socket.io gateway
   ├─ scheduler/      cron: close-past-days, purge-videos
   └─ health/         GET /health
```

Кожен модуль: `entities/`, `dto/` (заповнені) + `*.module.ts`, `*.controller.ts`, `*.service.ts` (скелети).

## Модель даних

```
users ──┬─< families >── users            (child_id, parent_id UNIQUE; CHECK child ≠ parent)
        │      │
        │      ├─< day_sessions (UNIQUE family_id+date) ─< exercise_records >── exercises
        │      └─< ledger_entries (earn: 1 на день; settlement: pending → confirmed|rejected)
        ├─< invites          (код 6 символів, 7 днів, одноразовий)
        ├─< refresh_tokens   (хеш, ротація, reuse-detection)
        └   otp_codes        (хеш коду, спроби, TTL) — без FK, за номером телефону
```

Обмеження на рівні БД (перевірені): формат E.164, вік 16–120, ставка 1–20 з кроком 0.5, `plan_days ⊂ {1..7}`,
`exercises_done ≤ exercises_total`, `completed ⇒ completed_at`, рівно один `earn` на день (частковий унікальний індекс),
`amount > 0`, узгодженість `status`/`resolved_at` для розрахунків, формат коду запрошення, `video_key ⇒ video_expires_at`.
Видалення користувача каскадно чистить усе (GDPR ст. 17) — перевірено.

## Карта API (префікс `/api/v1`)

| Метод | Шлях | Роль | DTO запиту → відповіді |
|---|---|---|---|
| POST | `/auth/otp/request` | public | `RequestOtpDto` → `RequestOtpResponseDto` |
| POST | `/auth/otp/verify` | public | `VerifyOtpDto` → `VerifyOtpResponseDto` |
| POST | `/auth/refresh` | public | `RefreshTokenDto` → `AuthTokensDto` |
| POST | `/auth/logout` | any | `LogoutDto` → `SuccessResponseDto` |
| GET / PATCH | `/users/me` | any | `UpdateProfileDto` → `UserResponseDto` |
| PUT | `/users/me/role` | any | `SetRoleDto` → `UserResponseDto` |
| POST | `/users/me/consent` | any | `AcceptConsentDto` → `UserResponseDto` |
| PUT | `/users/me/push-token` | any | `UpdatePushTokenDto` → `SuccessResponseDto` |
| DELETE | `/users/me` | any | → `SuccessResponseDto` |
| POST | `/families/invites` | child | `CreateInviteDto` → `InviteResponseDto` |
| GET | `/families/invites/active` | child | → `InviteResponseDto \| null` |
| POST | `/families/join` | parent | `AcceptInviteDto` → `FamilyResponseDto` |
| GET | `/families/current` | any | → `FamilyResponseDto` |
| PATCH | `/families/current/plan` | child | `UpdatePlanDto` → `FamilyResponseDto` |
| GET | `/families/current/stats` | any | → `FamilyStatsResponseDto` |
| GET | `/families/current/parent-status` | child | → `ParentStatusResponseDto` |
| POST | `/families/current/reminders` | child | → `ReminderResponseDto` |
| GET | `/exercises` | any | → `ExerciseResponseDto[]` |
| GET | `/workouts/today` | parent | → `TodayResponseDto` |
| POST | `/workouts/uploads` | parent | `CreateUploadUrlDto` → `UploadUrlResponseDto` |
| POST | `/workouts/:sessionId/exercises/:exerciseId/complete` | parent | `CompleteExerciseDto` → `CompleteExerciseResponseDto` |
| GET | `/workouts/calendar?month=YYYY-MM` | any | `CalendarQueryDto` → `CalendarResponseDto` |
| GET | `/workouts/days/:date` | child | → `DayDetailResponseDto` |
| GET | `/workouts/records/:recordId/clip` | child | → `ClipUrlResponseDto` |
| GET | `/ledger` | any | `LedgerListQueryDto` → `LedgerListResponseDto` |
| POST | `/ledger/settlements` | child | `CreateSettlementDto` → `LedgerEntryResponseDto` |
| POST | `/ledger/settlements/:id/resolve` | parent | `ResolveSettlementDto` → `LedgerEntryResponseDto` |
| GET | `/health` | public | (без префікса) |

Формат помилок: `ErrorResponseDto { statusCode, code: ErrorCode, message, details?, timestamp, path }` —
клієнт показує тексти за `code`, а не за `message`.

## План реалізації (порядок, у якому зручно вести AI-агента)

1. **Auth та каркас**: `AllExceptionsFilter`, `JwtAuthGuard`, `RolesGuard`, `OtpService`, `TokenService`, `SmsService` (Console → Twilio), `AuthController`; `UsersService` + `UsersController`; зареєструвати глобальні guards в `AppModule`.
2. **Сім'я**: `InvitesService`, `FamilyContextService`, `FamiliesService/Controller` (join, current, plan).
3. **Ядро тренувань**: `DayClockService`, `DaySessionsService.getOrCreateToday`, `ExercisesService`, `WorkoutsService.getToday`, `StorageService` (підписані URL), `ExerciseCompletionService` (транзакція + earn).
4. **Облік**: `BalanceService`, `LedgerService` (settlements з блокуванням), `StatsService` (streak, completion), `CalendarService`.
5. **Події й реальний час**: `PushService`, шаблони, `NotificationsListener`, `RealtimeGateway/Listener`, `ParentStatus`, нагадування.
6. **Фон**: `ClosePastDaysTask`, `PurgeVideosTask`, `AccountDeletionService`.
7. **Тести**: e2e-сценарій «OTP → роль → запрошення → 4 вправи → нарахування → переказ → підтвердження»; юніт-тести `computeStreak`, `DayClockService` (DST!), `IsStepOf`.

Правила для AI-агента: див. `docs/TZ-DELTA.md` (відмінності від ТЗ v3.0) та розділ 19 ТЗ.

## Сховище кадрів: local → S3/R2

Відео не зберігається. Застосунок робить 3 кадри, стискає (~150 КБ) і завантажує **напряму у сховище за підписаним URL**; дитина бачить лише ці кадри. Через 7 днів вони видаляються, запис вправи лишається («Фото видалено»).

```
Клієнт ──POST /workouts/uploads──► API ──► StorageService ──► StorageProvider (порт)
   │                                                            ├─ LocalStorageProvider  (STORAGE_DRIVER=local, диск)
   └──PUT <підписаний URL>──► local: наш /storage/object  |  s3: S3/R2 напряму   └─ S3StorageProvider     (STORAGE_DRIVER=s3)
```

Клієнт не знає, яке сховище під капотом: відповідь завжди `{ photoKey, uploadUrl, method, headers }`. Перехід: `STORAGE_DRIVER=s3` + `S3_BUCKET_PHOTOS`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (+ `S3_ENDPOINT` і `S3_REGION=auto` для Cloudflare R2). Код не змінюється. Додатково задайте lifecycle-правило бакета «видаляти через 7 днів» як другий рівень страхування.
Локальне сховище тримайте на Railway Volume й лише в одній репліці; підписи (HMAC) дійсні 15 хв (PUT) / 1 год (GET), ключ — `STORAGE_SIGNING_SECRET`.

## Тести

```bash
# потрібна PostgreSQL: DATABASE_URL на порожню БД (docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hf_test postgres:17)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hf_test npm test
```
Сценарій `test/app.e2e-spec.ts` проходить усе: вхід, ролі, запрошення, план, вправи з кадрами, нарахування, паралельні перекази, журнал, закриття днів, видалення кадрів і акаунта, ізоляцію сімей. Тести на vitest + SWC (пакети Nest 12 — ESM).

## Вхід через Google (Gmail)

1. Google Cloud Console → APIs & Services → Credentials → «OAuth client ID»: створіть **Web** (для Expo/web), **Android** (пакет застосунку + SHA-1 підпису EAS) та **iOS** (bundle ID).
2. Сервер: `GOOGLE_CLIENT_IDS=<web-id>,<android-id>,<ios-id>` (через кому). Порожньо — `POST /auth/google` повертає `GOOGLE_AUTH_DISABLED`, а застосунок кнопку не показує.
3. Застосунок: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (у `.env` або `eas.json`), потім нова збірка.

## Вхід без паролів

Згідно з ТЗ §5.4 паролів немає: `POST /auth/otp/request` → SMS-код (6 цифр, 5 хв, повторно через 60 с, 5 спроб) → `POST /auth/otp/verify` → пара токенів (access JWT 15 хв + refresh 30 днів із ротацією; повторне використання старого refresh відкликає всі сесії). «Відновлення доступу» = новий вхід за тим самим номером. `POST /auth/logout-all` відкликає токени всіх пристроїв. SMS дозволені лише для країн зі `SMS_ALLOWED_COUNTRIES` (за замовчуванням PL,UA; має збігатися з Geo Permissions у Twilio).

**Вхід за поштою** (поруч із телефоном): випадковий код у листі через Resend зі свого домену (`MAIL_FROM`); правильний код = пошту підтверджено (`users.email_verified_at`); див. `docs/RESEND.md`.
