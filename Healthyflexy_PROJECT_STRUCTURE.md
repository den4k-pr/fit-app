# Healthyflexy («Книжка турботи»): карта проєкту

Сімейний застосунок: дитина (child) платить батькам 50+ (parent) винагороду за щоденні вправи. Гроші лише **облік** (реальний переказ поза застосунком). Специфікація продукту: `Healthyflexy_TZ_v3_MVP.md`. Відмінності реалізації від ТЗ (ТЗ писалось під Supabase): `healthyflexy-backend/docs/TZ-DELTA.md`.

**Дві незалежні папки-проєкти:**
- `healthyflexy-backend`: NestJS 12, TypeORM 0.3, PostgreSQL, TypeScript 6, Node ≥ 22.22.3. Деплой: Railway (Dockerfile).
- `healthyflexy-mobile`: Expo SDK 57, React Native 0.86, Expo Router, TanStack Query, zustand, i18next, TypeScript 6.

**Позначки:** ✅ реалізовано · 🟡 скелет (типи/сигнатури є, логіки немає)

**Інваріанти (не порушувати):**
1. Баланс = `SUM(earn) − SUM(settlement confirmed)`, рахує лише сервер (SQL). Клієнт гроші не рахує.
2. Один `earn` на день (унікальний індекс). Усі мутації грошей у транзакції з `FOR UPDATE`.
3. «День» = локальна дата батька/матері (`users.timezone`), формат `YYYY-MM-DD`.
4. `familyId` завжди береться на сервері з користувача, ніколи з клієнта.
5. Помилки API: `{ statusCode, code: ErrorCode, message, details? }`. Клієнт показує текст за `code` (i18n), не за `message`.
6. Відео: завантаження напряму в S3 за підписаним URL, зберігається 7 днів; завжди є шлях «Зарахувати без відео».
7. Ролі: `parent` / `child`, обирається один раз. API-префікс `/api/v1`, `/health` без префікса.

---

## 1. Backend: `healthyflexy-backend/`

### Корінь

| Файл/папка | Призначення |
|---|---|
| `package.json`, `package-lock.json` | Залежності та скрипти (`start:dev`, `migration:*`, `seed`, `test`) |
| `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json` | TS 6 (`types` та `rootDir` задані явно), Nest CLI із Swagger-плагіном для `*.dto.ts` |
| `eslint.config.mjs`, `.prettierrc` | Лінт і форматування |
| `Dockerfile`, `railway.json`, `.dockerignore` | Збірка та деплой на Railway (healthcheck `/health`) |
| `.env.example` | Усі змінні оточення; локально копіюється в `.env` |
| `README.md`, `docs/TZ-DELTA.md` | Запуск, деплой, карта API; відмінності від ТЗ |
| `test/` | e2e-заготовка (jest-e2e) |

### `src/`

| Шлях | Що там | Стан |
|---|---|---|
| `main.ts`, `app.module.ts` | Bootstrap (helmet, ValidationPipe, Swagger `/docs`), складання модулів. Глобальні guards/filter закоментовані до реалізації | ✅ |
| `config/` | `env.validation.ts`: усі env-змінні з валідацією при старті; тип `AppConfigService` | ✅ |
| `database/` | `data-source.ts` (CLI), `typeorm.options.ts`, `base.entity.ts`, `database.module.ts` | ✅ |
| `database/migrations/` | `InitSchema` (9 таблиць, 18 CHECK, індекси, каскади). `synchronize` вимкнено | ✅ |
| `database/seeds/` | 4 стартові вправи (`exercises.seed-data.ts`) і runner `npm run seed` | ✅ |
| `database/transformers/` | `decimalTransformer` (numeric → number) | ✅ |
| `common/enums/` | UserRole, RelationshipType, SessionStatus, LedgerType/Status, Currency, … | ✅ |
| `common/constants/` | `app.constants.ts` (ліміти OTP/відео/плану), `error-codes.ts`, `regex.constants.ts` | ✅ |
| `common/interfaces/` | AuthenticatedUser, JwtAccessPayload, CursorPage | ✅ |
| `common/events/` | Доменні події (`exercise.completed`, `settlement.created`, …) для notifications/realtime | ✅ |
| `common/dto/`, `validators/`, `types/`, `exceptions/` | ErrorResponseDto, PaginationQueryDto, `IsStepOf`, LocalizedText, `AppException` | ✅ |
| `common/filters/`, `interceptors/`, `utils/` | AllExceptionsFilter, LoggingInterceptor, hash/phone/money/cursor/date-утиліти | 🟡 |

### `src/modules/`: кожен модуль має `entities/` та `dto/` (✅) + module/controller/service (🟡, якщо не сказано інше)

| Модуль | Призначення | Таблиці / ключові маршрути |
|---|---|---|
| `auth/` | OTP-вхід, JWT + refresh з ротацією. `decorators/` (@Public, @Roles, @CurrentUser) ✅, `guards/` (JwtAuthGuard, RolesGuard) 🟡 | `otp_codes`, `refresh_tokens` · `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/logout` |
| `users/` | Профіль, роль, згода, push-токен, видалення акаунта (GDPR) | `users` · `/users/me…` |
| `families/` | Сім'я, план і ставка, запрошення, статус батька, нагадування; `FamilyContextService` | `families`, `invites` · `/families/…` |
| `exercises/` | Довідник вправ (локалізовані тексти) | `exercises` · `/exercises` |
| `workouts/` | День, виконання вправи (транзакція + нарахування), календар, статистика, кліпи | `day_sessions`, `exercise_records` · `/workouts/…` |
| `ledger/` | Облік `earn` / `settlement`, баланс | `ledger_entries` · `/ledger…` |
| `storage/` | S3-сумісне сховище: підписані URL (upload 15 хв, download 1 год) | (без таблиць) |
| `sms/` | Порт `SmsProvider`; `providers/` Console ✅ (dev), Twilio 🟡 | (без таблиць) |
| `notifications/` | Expo Push, шаблони uk/pl/en, слухач доменних подій | (без таблиць) |
| `realtime/` | socket.io `/realtime`, кімнати `family:{id}` / `user:{id}`; типи подій ✅ | (без таблиць) |
| `scheduler/` | Cron: закриття пропущених днів, чистка відео/токенів | (без таблиць) |
| `health/` | `GET /health` (перевіряє БД) ✅ | (без таблиць) |

**Як додати логіку:** розширюєте service всередині модуля, controller лише приймає DTO й викликає service, помилки кидаєте як `AppException(ErrorCode.X, HttpStatus.Y)`, зміни схеми йдуть через `npm run migration:generate`.

---

## 2. Mobile: `healthyflexy-mobile/`

### Корінь

| Файл/папка | Призначення |
|---|---|
| `package.json`, `package-lock.json` | Залежності SDK 57 (версії з `bundledNativeModules`) |
| `app.config.ts` | Динамічний конфіг Expo: scheme `healthyflexy`, плагіни (camera без мікрофона, notifications), `APP_ENV` |
| `eas.json` | Профілі збірки development / preview / production та їхні URL бекенду |
| `tsconfig.json` | Alias `@/*` → `src/*` |
| `.env.example` | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WS_URL` (локально копіюється в `.env`) |
| `assets/` | `images/` (плейсхолдер-іконки), `demo/`, `fonts/`, `README.md` |
| `README.md` | Запуск, правила, порядок реалізації |

### `src/`

| Шлях | Що там | Стан |
|---|---|---|
| `app/` | Expo Router. `_layout.tsx` (корінь), `index.tsx`, `+not-found.tsx`, `invite.tsx`, `settlement/new.tsx` (модалки), `exercise/[exerciseId].tsx`, `clip/[recordId].tsx`, `join/[code].tsx` | 🟡 екрани = `ScreenPlaceholder` |
| `app/(auth)/` | consent, onboarding, phone, otp, role, profile-setup, waiting-invite | 🟡 |
| `app/(parent)/` | Вкладки батька/матері: `today`, `history`, прихований `account` | 🟡 |
| `app/(child)/` | Вкладки дитини: `dashboard`, `plan`, `profile` | 🟡 |
| `types/` | `enums.ts`, `common.ts`, `api/*` (моделі й запити = дзеркало DTO бекенду), `realtime.ts`, `notifications.ts`, `navigation.ts`, `i18next.d.ts` | ✅ |
| `api/` | `client.ts` (axios), `errors.ts` (ApiError), `query-client.ts`, `query-keys.ts`, `interceptors.ts` 🟡 | ✅ |
| `api/endpoints/` | Типізовані виклики: `auth`, `users`, `families`, `exercises`, `workouts`, `ledger` | ✅ |
| `constants/` | limits, routes, weekdays, currencies, languages, relationships, storage-keys, … | ✅ |
| `config/env.ts` | Типізований доступ до `EXPO_PUBLIC_*` | ✅ |
| `theme/tokens.ts` | Кольори (`#1F9D6B`…), відступи, типографіка для 50+ | ✅ |
| `i18n/` | `index.ts` + `locales/{uk,pl,en}.json` (~205 ключів, типобезпечні, вкл. усі коди помилок) | ✅ |
| `store/` | zustand: `auth`, `onboarding` (persist), `settings` (persist), `exercise-flow` (машина станів запису) | ✅ |
| `providers/` | `AppProviders` (gesture → safe-area → QueryClient) | ✅ |
| `features/<name>/` | Поділ за функціями: `auth`, `onboarding`, `family`, `workout`, `history`, `ledger`, `dashboard`, `profile`, `notifications`, `realtime`. У кожній `components/` (типізовані Props, без тіла) і `hooks/` (повні сигнатури, `throw Not implemented`) | 🟡 |
| `features/auth/auth.schemas.ts`, `features/onboarding/types.ts`, `onboarding.slides.ts` | zod-схеми форм, тип згоди, дані слайдів | ✅ |
| `shared/ui/` | Дизайн-система: Screen, AppText, Button, Card, TextField, Checkbox, Sheet, ConfirmDialog, … (`ScreenPlaceholder` ✅) | 🟡 |
| `shared/components/`, `shared/hooks/` | DemoVideoPlayer, ClipPlayer, MoneyText; useAppState, useNetworkStatus, useCountdown, … | 🟡 |
| `services/` | `auth/token-storage.ts` ✅ (SecureStore); `notifications/*`, `realtime/socket.ts`, `video/upload-video.ts`, `camera/permissions.ts` | 🟡 |
| `lib/` | Чисті утиліти: format-money, format-date, plural, phone, share, timezone, monthly-estimate, … | 🟡 |

**Як додати екран/функцію:** маршрут у `app/`, логіка й UI у `features/<name>/`, виклик API через `api/endpoints` + хук на TanStack Query (ключі з `query-keys.ts`), тексти лише через i18n (ключі додавати в усі три `locales/*.json`).

---

## 3. Зв'язок між частинами

| Бекенд | Мобільний застосунок |
|---|---|
| `modules/*/dto/*.dto.ts` | `src/types/api/*.ts` (ручне дзеркало; при зміні DTO оновлювати обидва) |
| `common/enums/*` | `src/types/enums.ts` (const-об'єкти + union-типи) |
| `common/constants/error-codes.ts` | `src/types/api/common.ts` (`ErrorCode`) + `i18n/locales/*.json` → `errors.*` |
| `modules/realtime/realtime.events.ts` | `src/types/realtime.ts` |
| `modules/notifications/notifications.types.ts` | `src/types/notifications.ts` |
| `common/constants/app.constants.ts` | `src/constants/limits.ts` |

## 4. Локальний запуск

| Що | Команда |
|---|---|
| Бекенд (в папці бекенду): база, таблиці, вправи, сервер | `createdb healthyflexy` → `npm run migration:run` → `npm run seed` → `npm run start:dev` (перевірка: `GET localhost:3000/health`) |
| Мобільний (в папці mobile) | `npx expo login` → `npx expo start --go` (Expo Go на телефоні) |
