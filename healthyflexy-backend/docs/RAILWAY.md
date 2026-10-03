# Розгортання на Railway

Проєкт збирається з `Dockerfile` (див. `railway.json`). При кожному старті контейнер **сам** виконує міграції (`DB_RUN_MIGRATIONS=true`
у Dockerfile) і **сам** додає початкові вправи (`SEED_ON_BOOT`), тож окремих команд не потрібно.
Перевірено симуляцією холодного старту (лише production-залежності, порожня база); на самому Railway цей документ ще не проганявся.

## 1. Сервіс і база

1. Залийте бекенд у GitHub-репозиторій.
2. Railway → **New Project → Deploy from GitHub repo** (цей репозиторій).
3. У проєкті: **New → Database → Add PostgreSQL**.
4. Сервіс бекенду → **Settings → Networking → Generate Domain**. Запишіть адресу: `https://<щось>.up.railway.app`.

## 2. Змінні (сервіс бекенду → Variables)

| Змінна | Значення | Навіщо |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Add Reference) | база; внутрішня мережа Railway |
| `DATABASE_SSL` | `false` | для внутрішньої адреси SSL не потрібен |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` | підпис токенів |
| `TOKEN_HASH_SECRET` | `openssl rand -base64 48` (інший) | хеші кодів і refresh-токенів |
| `PUBLIC_BASE_URL` | `https://<ваша адреса>.up.railway.app` | за нею телефон завантажує кадри; Twilio шле статус доставки |
| `LOG_FORMAT` | `json` | структуровані логи, зручні для фільтрів Railway |
| `SMS_PROVIDER` | `twilio` (див. розділ 4 про перші тести) | справжні SMS |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | з консолі Twilio | доступ до Twilio |
| `TWILIO_MESSAGING_SERVICE_SID` | `MG…` | відправник |
| `SMS_ALLOWED_COUNTRIES` | `PL,UA` | збігається з Geo permissions у Twilio |
| `STORAGE_LOCAL_DIR` | `/data/storage` | кадри лежать на Volume |
| `RAILWAY_RUN_UID` | `0` | Volume монтується від root: без цього немає прав запису |

Після першого деплою задайте `PUBLIC_BASE_URL` (адреса з кроку 4) і перезапустіть сервіс.

## 3. Volume для кадрів

Файлова система контейнера стирається при кожному деплої. Сервіс → **Volumes → New Volume**, mount path `/data`.
Один сервіс = одна репліка. Для кількох реплік або надійнішого сховища: `STORAGE_DRIVER=s3` + `S3_*` (Cloudflare R2 / AWS S3), код не змінюється.

## 4. Вхід: лише з кодом підтвердження

Тестових акаунтів із фіксованим кодом і входу без коду більше немає. Кожен вхід/реєстрація — випадковий 6-значний код у листі (або SMS).

- **Пошта (основний спосіб):** `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=re_...`, `MAIL_FROM=auth@<ваш домен>` (домен підтверджений у Resend), `MAIL_FROM_NAME=Книжка турботи`. Покроково: `docs/RESEND.md`.
- **Телефон:** `SMS_PROVIDER=smsapi` + `SMSAPI_TOKEN` (найдешевше для Польщі/України, див. `docs/SMS.md`). Поки не підключено — вкладка «Телефон» показує пояснення й кнопку «Увійти через пошту».
- `NODE_ENV=production`: консольні провайдери (лист/SMS у лог) у production відмовляють, а на старті сервер друкує ❌ — щоб ніхто не «входив через логи».
- Старі змінні `OTP_TEST_NUMBERS`, `OTP_TEST_EMAILS`, `OTP_TEST_CODE`, `OTP_TEST_IN_PRODUCTION`, `OTP_DISABLED`, `LOGIN_ALLOWED_PHONES` більше не читаються — їх можна видалити з Railway.

## 5. Мобільний застосунок

У `healthyflexy-mobile/.env`: `EXPO_PUBLIC_API_URL=https://<ваша адреса>.up.railway.app/api/v1`, `EXPO_PUBLIC_WS_URL=https://<ваша адреса>.up.railway.app`,
далі `npx expo start --go --clear`. https вирішує і проблему «телефон не бачить localhost».
У `eas.json` замініть адреси профілів на свої.

## 6. Twilio

- **Пробний акаунт** шле SMS лише на **підтверджені** номери (Console → Phone Numbers → Verified Caller IDs). Інакше помилка 21608.
- **Geo permissions** (Console → Messaging → Settings): увімкніть Польщу й Україну, інші вимкніть (захист від SMS-шахрайства).
- Відправник: Messaging Service (краще) або номер із SMS-можливістю. В Україні й Польщі буквений відправник може потребувати реєстрації.
- Статус доставки сервер отримує сам: до кожного SMS додається `statusCallback` на `PUBLIC_BASE_URL/api/v1/sms/twilio-status` (підпис Twilio перевіряється).

## 7. Як читати логи (Railway → Deployments → View Logs)

На старті сервер друкує блок `Startup`: що працює (✅) і **що виправити** (❌/⚠️). Далі кожен запит: `method`, `path`, `status`, `ms`, `code` (причина відмови).

| Що бачите | Що це означає |
|---|---|
| Жодного запиту `/auth/otp/request` при натисканні «Отримати код» | телефон не бачить сервер: неправильна `EXPO_PUBLIC_API_URL` (на телефоні `localhost` не працює) |
| `status:429 code:OTP_COOLDOWN` | повторний запит раніше ніж через 60 с |
| `status:422 code:PHONE_COUNTRY_NOT_ALLOWED` | країна номера поза `SMS_ALLOWED_COUNTRIES` |
| `event:sms_failed … code:21608` (або інший код, поле `hint` пояснює) | Twilio відмовив ще до відправки: див. `hint` |
| `event:sms_accepted sid:SM… status:queued` | Twilio прийняв SMS у чергу (це ще не «доставлено») |
| далі `event:sms_delivery status:delivered` | SMS дійшло |
| далі `event:sms_delivery status:undelivered errorCode:… hint:…` | оператор/Twilio не доставили: причина в `hint` |
| `sms_accepted`, але жодного `sms_delivery` | неправильний `PUBLIC_BASE_URL` (Twilio не може достукатися до вебхука) |
| `status:401 code:OTP_INVALID / OTP_EXPIRED / OTP_TOO_MANY_ATTEMPTS` | невірний код / код прострочений / забагато спроб |
| `status:0 code:CLIENT_ABORTED` | телефон розірвав з'єднання (обрив мережі) |
| `status:5xx` + рядок з `stack` | помилка сервера: стек у тому ж записі |

Кожен запис має `requestId`: той самий id повертається у заголовку відповіді `x-request-id`.
