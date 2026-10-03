# Гроші: поповнення фонду, виплати батькам, підписка

## Схема

| Що | Як | Чому так |
|---|---|---|
| Спонсор поповнює фонд | **Stripe PaymentSheet**: картка, Apple Pay, Google Pay, **BLIK** (лише PLN), PayPal | Правила App Store (3.1.1/3.1.3) і Google Play Payments: передача **реальних грошей між людьми** — не цифровий товар, тож **IAP для неї заборонений**; магазини не беруть 15–30 % |
| Автопоповнення (щотижня / щомісяця) | Stripe SetupIntent → збережена картка → списання `off_session` (cron кожні 15 хв, ідемпотентно) | BLIK не підтримує повторних списань — лише картка (у т.ч. Apple/Google Pay) |
| Батько/мати виводить зароблене | **Stripe Connect Express**: Stripe сам перевіряє особу (KYC), зберігає рахунок/картку й виплачує | Платформа не зберігає банківських даних. **Виплат через BLIK Stripe не підтримує** (BLIK — лише оплата) |
| Підписка на застосунок (монетизація) | **App Store** (StoreKit 2 + Server Notifications V2) і **Google Play Billing** (subscriptionsv2 + RTDN) | Цифрова послуга в застосунку → лише IAP |

Гроші завжди зараховує **сервер** за підтвердженням Stripe (вебхук або перевірка PaymentIntent), клієнту не віримо.
Облікові поповнення/перекази (без Stripe) лишаються як були: `provider = manual`.

**Доступно до виведення** = min(зароблене − виплачене − очікує, реально оплачене у фонд через Stripe − уже виведене через Stripe).
Виплата резервується в транзакції під блокуванням сім'ї, потім Stripe Transfer з ключем ідемпотентності; відмова Stripe → переказ `rejected`, сума знову доступна.

> ⚠️ ТЗ §20.2: перед запуском реальних грошей — консультація з юристом. Гроші між оплатою спонсора й виплатою лежать
> на балансі платформи в Stripe (модель «separate charges and transfers»). Stripe Connect бере KYC на себе, але договір
> із користувачами, податки й ліцензування (PSD2 / посередництво платежів) мають бути погоджені.

## Stripe (≈30 хвилин)

1. dashboard.stripe.com → акаунт на компанію (країна платформи — Польща, якщо потрібен BLIK).
2. **Settings → Payment methods**: увімкнути Cards, Apple Pay, Google Pay, **BLIK**, PayPal (за бажанням).
3. **Settings → Apple Pay**: додати домен/Merchant ID з Apple Developer (Identifiers → Merchant IDs, напр. `merchant.com.healthyflexy.app`).
4. **Connect → Get started** → тип **Express**, країни виплат (PL та інші з ЄС; **Україна Connect-акаунти не підтримує**).
5. **Developers → API keys**: `sk_test_…` / `pk_test_…` (потім live).
6. **Developers → Webhooks → Add endpoint** `https://<backend>/api/v1/payments/webhooks/stripe`:
   - «Your account» події: `payment_intent.succeeded`, `payment_intent.processing`, `payment_intent.payment_failed`,
     `payment_intent.canceled`, `charge.refunded`, `charge.dispute.created`, `setup_intent.succeeded`, `transfer.reversed`;
   - ще один endpoint на той самий URL для **Connected accounts**: `account.updated`.
7. Railway → змінні бекенду:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...           # endpoint «Your account»
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...   # endpoint «Connected accounts»
STRIPE_MERCHANT_COUNTRY=PL
STRIPE_CONNECT_DEFAULT_COUNTRY=PL
STRIPE_MERCHANT_NAME=Książeczka troski
```

8. Застосунок: `STRIPE_APPLE_MERCHANT_ID` (для збірки, app.config) і `EXPO_PUBLIC_STRIPE_APPLE_MERCHANT_ID` — той самий Merchant ID; **нова збірка** (нативний модуль Stripe).

Тест: картка `4242 4242 4242 4242`; BLIK — тестові коди з документації Stripe (BLIK → Testing), валюта сім'ї має бути PLN; Connect — тестові дані онбордингу Stripe.

## App Store (підписка)

1. App Store Connect → підписка (група, продукт), **App Store Server Notifications V2** → URL `https://<backend>/api/v1/subscriptions/apple/notifications` (Sandbox і Production).
2. Завантажити кореневі сертифікати Apple (`AppleRootCA-G3.cer`, `AppleIncRootCertificate.cer`) з apple.com/certificateauthority у папку на сервері.
3. Змінні: `APPLE_BUNDLE_ID`, `APPLE_APP_ID` (для Production), `APPLE_IAP_ENVIRONMENT=Sandbox|Production`, `APPLE_ROOT_CERTS_DIR`.
4. Застосунок під час покупки передає `appAccountToken = id користувача`, після покупки — `Transaction.jwsRepresentation` на `POST /subscriptions/apple`.

## Google Play (підписка)

1. Play Console → підписка; Google Cloud → сервісний акаунт → у Play Console «Users and permissions» доступ до фінансових даних і замовлень.
2. **Monetization setup → Real-time developer notifications**: тема Pub/Sub, push-підписка на `https://<backend>/api/v1/subscriptions/google/rtdn?token=<GOOGLE_RTDN_TOKEN>`.
3. Змінні: `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (вміст JSON-ключа), `GOOGLE_RTDN_TOKEN`.
4. Застосунок: `setObfuscatedAccountId(id користувача)` у покупці, після покупки — `POST /subscriptions/google { productId, purchaseToken }`. Сервер сам підтверджує (acknowledge) покупку — інакше Google поверне гроші через 3 дні.

## Що де в коді

- `src/modules/payments` — Stripe: поповнення, вебхуки (підпис + ідемпотентність `payment_webhook_events`), автопоповнення (`auto-topup.task.ts`), виплати Connect.
- `src/modules/subscriptions` — App Store (`@apple/app-store-server-library`) і Google Play (REST + сервісний акаунт).
- Міграція `1791300000000-Payments`. Тести: e2e «гроші через Stripe» (фейковий клієнт Stripe, справжня перевірка підпису вебхуків).
