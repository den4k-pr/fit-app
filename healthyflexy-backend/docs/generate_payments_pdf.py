# -*- coding: utf-8 -*-
"""Генератор PDF-документації платіжного шлюзу Healthyflexy."""
from fpdf import FPDF
from fpdf.fonts import FontFace

FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_ITALIC = "/System/Library/Fonts/Supplemental/Arial Italic.ttf"
OUT = "/Users/denys/Desktop/IOI/myProjects/fit-app/Платіжний шлюз - Документація.pdf"


class Doc(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Arial", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 5, "Платіжний шлюз — Документація · Healthyflexy", align="R")
        self.ln(7)
        self.set_text_color(0, 0, 0)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-12)
        self.set_font("Arial", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 5, f"Сторінка {self.page_no()}", align="C")
        self.set_text_color(0, 0, 0)


def build():
    pdf = Doc("P", "mm", "A4")
    pdf.set_margins(18, 16, 18)
    pdf.set_auto_page_break(True, margin=16)
    W = pdf.w - pdf.l_margin - pdf.r_margin
    pdf.add_font("Arial", "", FONT_REG)
    pdf.add_font("Arial", "B", FONT_BOLD)
    pdf.add_font("Arial", "I", FONT_ITALIC)
    pdf.set_font("Arial", "", 10)

    # ─── титул ───
    pdf.add_page()
    pdf.ln(70)
    pdf.set_font("Arial", "B", 26)
    pdf.set_text_color(31, 157, 107)
    pdf.multi_cell(W, 12, "Платіжний шлюз", align="C")
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Arial", "B", 15)
    pdf.multi_cell(W, 8, "Документація з підключення та налаштування", align="C")
    pdf.ln(4)
    pdf.set_font("Arial", "", 12)
    pdf.multi_cell(W, 7, "Healthyflexy («Книжка турботи»)", align="C")
    pdf.ln(18)
    pdf.set_font("Arial", "I", 11)
    pdf.multi_cell(
        0, 6,
        "Поповнення фонду, автопоповнення, виплати батькам (Stripe / Stripe Connect) "
        "та підписка (App Store / Google Play).",
        align="C",
    )
    pdf.ln(30)
    pdf.set_font("Arial", "", 9)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(W, 5, "Версія 1.0 · Жовтень 2026", align="C")
    pdf.set_text_color(0, 0, 0)

    # ─── хелпери ───
    def h1(text):
        pdf.add_page()
        pdf.set_font("Arial", "B", 15)
        pdf.set_text_color(31, 157, 107)
        pdf.multi_cell(W, 8, text)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(2)

    def h2(text):
        if pdf.get_y() > 250:
            pdf.add_page()
        pdf.ln(3)
        pdf.set_font("Arial", "B", 12)
        pdf.multi_cell(W, 7, text)
        pdf.ln(1)

    def p(text):
        pdf.set_font("Arial", "", 10)
        pdf.multi_cell(W, 5.6, text)
        pdf.ln(1.6)

    def bullets(items):
        pdf.set_font("Arial", "", 10)
        for it in items:
            pdf.set_x(pdf.l_margin + 4)
            pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin - 4, 5.6, "•  " + it)
            pdf.ln(0.6)

    def table(headers, rows, widths):
        pdf.set_font("Arial", "", 8.5)
        with pdf.table(
            col_widths=widths,
            text_align="LEFT",
            line_height=4.6,
            padding=1.4,
            borders_layout="ALL",
            headings_style=FontFace(emphasis="BOLD"),
        ) as tb:
            hr = tb.row()
            for x in headers:
                hr.cell(x)
            for r in rows:
                tr = tb.row()
                for x in r:
                    tr.cell(str(x))
        pdf.ln(2)

    # ═══ 1. Огляд ═══
    h1("1. Огляд системи")
    p(
        "У Healthyflexy два типи грошових операцій, і вони реалізовані через різні механізми, "
        "бо вимоги магазинів застосунків різні."
    )
    bullets([
        "Передача реальних грошей між людьми (дитина поповнює фонд → батько виводить винагороду) — "
        "це НЕ цифровий товар, тому через IAP (App Store / Google Play) вона ЗАБОРОНЕНА правилами магазинів. "
        "Для неї використовується Stripe (PaymentSheet) і Stripe Connect Express.",
        "Підписка на сам застосунок (монетизація) — це цифрова послуга всередині застосунку, тому вона йде "
        "лише через IAP: App Store (StoreKit 2) і Google Play Billing.",
    ])
    p(
        "Головний принцип: гроші завжди зараховує СЕРВЕР за підтвердженням від платіжної системи "
        "(вебхук або перевірка PaymentIntent на сервері). Клієнту не вірять ні в чому, що стосується грошей."
    )
    p(
        "Модель Stripe — «separate charges and transfers»: гроші спонсора спочатку потрапляють на баланс "
        "платформи в Stripe, а виплата батькові — це окремий Transfer на його Connect-акаунт."
    )

    # ═══ 2. Потоки грошей ═══
    h1("2. Потоки грошей")
    h2("2.1 Поповнення фонду (спонсор / дитина)")
    bullets([
        "Застосунок просить сервер створити PaymentIntent (POST /payments/fund/intent).",
        "Сервер валідує суму (мін. 2, макс. 999 999,99) і фіксує валюту сім'ї.",
        "Stripe PaymentSheet показує доступні способи: картка, Apple Pay, Google Pay, BLIK (тільки PLN), PayPal.",
        "Запис fund_deposits створюється зі статусом pending; у succeeded він переходить ТІЛЬКИ після вебхука payment_intent.succeeded або перевірки PaymentIntent на сервері.",
        "Клієнт після оплати опитує статус (до ~9 с) — для BLIK/PayPal, які підтверджуються не миттєво.",
    ])
    h2("2.2 Автопоповнення")
    bullets([
        "SetupIntent зберігає картку (off_session) — без картки автопоповнення не ввімкнути.",
        "Cron кожні 15 хвилин списує належні суми (idempotency-ключ на кожен запуск — подвійного списання немає).",
        "Після 3 невдалих списань поспіль автопоповнення вимикається; невдалі повторюються через 24 год.",
        "BLIK для автопоповнення НЕ підходить — лише картка (зокрема через Apple Pay / Google Pay).",
    ])
    h2("2.3 Виплата батькові (Stripe Connect Express)")
    bullets([
        "Батько проходить онбординг Stripe (особа, рахунок/картка) — Stripe сам робить KYC.",
        "Доступно до виведення = min(зароблене − виплачене − очікує, реально оплачене у фонд через Stripe − уже виведене).",
        "Виплата резервується в транзакції під блокуванням сім'ї (FOR UPDATE), потім Stripe Transfer з idempotency-ключем.",
        "Відмова Stripe → переказ стає rejected, сума знову доступна.",
        "BLIK для виплат Stripe НЕ підтримує (BLIK — тільки спосіб оплати).",
    ])
    h2("2.4 Підписка (монетизація)")
    bullets([
        "App Store: StoreKit 2 — застосунок передає Transaction.jwsRepresentation, сервер перевіряє JWS офіційною бібліотекою Apple.",
        "Google Play: purchaseToken → purchases.subscriptionsv2.get; сервер підтверджує (acknowledge), інакше Google поверне гроші через 3 дні.",
        "Статуси оновлюються вебхуками: App Store Server Notifications V2 та Google RTDN (Pub/Sub).",
    ])

    # ═══ 3. Що реалізовано ═══
    h1("3. Що реалізовано (ендпоінти)")
    table(
        ["Метод", "Ендпоінт", "Хто / призначення"],
        [
            ["GET", "/payments/config", "обидві ролі — чи підключено оплати, ключ для PaymentSheet"],
            ["POST", "/payments/fund/intent", "дитина — створити PaymentIntent поповнення"],
            ["GET", "/payments/fund/intent/:id", "дитина — статус поповнення"],
            ["POST", "/payments/auto-topup/setup-intent", "дитина — зберегти картку"],
            ["GET/PUT", "/payments/auto-topup", "дитина — переглянути/змінити автопоповнення"],
            ["POST", "/payments/payouts/onboarding", "батько — посилання онбордингу Connect"],
            ["GET", "/payments/payouts/status", "батько — статус і «доступно до виведення»"],
            ["POST", "/payments/payouts/dashboard", "батько — кабінет Stripe Express"],
            ["POST", "/payments/payouts/withdraw", "батько — вивести зароблене"],
            ["GET", "/payments/payouts/return", "повернення з онбордингу → deep link"],
            ["POST", "/payments/webhooks/stripe", "вебхук Stripe (підпис Stripe-Signature)"],
            ["GET", "/subscriptions/me", "статус підписки користувача"],
            ["POST", "/subscriptions/apple", "перевірка покупки App Store"],
            ["POST", "/subscriptions/google", "перевірка покупки Google Play"],
            ["POST", "/subscriptions/apple/notifications", "App Store Server Notifications V2"],
            ["POST", "/subscriptions/google/rtdn", "Google RTDN (Pub/Sub)"],
        ],
        [28, 74, 74],
    )

    # ═══ 4. Безпека ═══
    h1("4. Безпека та захист від шахрайства")
    bullets([
        "Підпис вебхуків перевіряється секретом STRIPE_WEBHOOK_SECRET / STRIPE_CONNECT_WEBHOOK_SECRET (Stripe-Signature).",
        "Ідемпотентність вебхуків: таблиця payment_webhook_events — повторна доставка події нічого не змінює.",
        "Клієнт не рахує гроші: суми (поповнення, автопоповнення, виплати) валідуються й обчислюються лише на сервері.",
        "Виплата резервується в транзакції з FOR UPDATE на рядок сім'ї — паралельні запити не можуть списати двічі.",
        "«Доступно до виведення» обмежене і заборгованістю, і реально оплаченим фондом — не можна вивести більше, ніж внесено.",
        "Кінцеві статуси (refunded / disputed) не перезаписуються пізнішою подією про успіх.",
        "transfer.reversed повертає переказ у стан rejected, сума знову доступна.",
        "charge.refunded зменшує фонд; charge.dispute.created позначає спір.",
        "Помилки Stripe не витікають клієнту (PAYMENT_FAILED) — деталі лише в лог сервера.",
        "Google Play: без acknowledge за 3 дні Google сам повертає гроші — сервер підтверджує одразу.",
        "Apple/Google покупка прив'язана до користувача (appAccountToken / obfuscatedAccountId = id користувача) — чужу покупку не прив'язати.",
        "Ліміти: поповнення 2–999 999,99; автопоповнення вимикається після 3 невдач.",
    ])

    # ═══ 5. Stripe ═══
    h1("5. Підключення Stripe (покроково)")
    h2("5.1 Створення акаунта")
    bullets([
        "dashboard.stripe.com → створити акаунт на компанію.",
        "Країна платформи — Польща (якщо потрібен BLIK: BLIK доступний лише для PLN і лише в деяких країнах).",
        "Активувати акаунт: підтвердити email, заповнити дані компанії.",
    ])
    h2("5.2 API-ключі")
    bullets([
        "Developers → API keys → скопіювати Publishable key (pk_test_…) і Secret key (sk_test_…).",
        "Перед продом — перейти на live-ключі (pk_live_…, sk_live_…).",
    ])
    h2("5.3 Способи оплати")
    p("Settings → Payment methods → увімкнути:")
    bullets([
        "Cards (обов'язково — база для автосписань і Apple/Google Pay).",
        "Apple Pay (див. 5.4).",
        "Google Pay.",
        "BLIK (тільки PLN; вмикається в розділі Payment methods для Польщі).",
        "PayPal (за бажанням).",
    ])
    h2("5.4 Apple Pay: Merchant ID")
    bullets([
        "developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → Merchant IDs → створити (напр. merchant.com.healthyflexy.app).",
        "Stripe → Settings → Apple Pay → додати домен (веб-домен підтвердження) і Merchant ID.",
        "Той самий Merchant ID прописати у збірці застосунку (див. 8).",
    ])
    h2("5.5 Stripe Connect Express (виплати батькам)")
    bullets([
        "Connect → Get started → тип Express.",
        "Країни виплат: PL та інші ЄС. УВАГА: Україну Stripe Connect не підтримує — батьки з України виплати через Stripe отримати не зможуть.",
        "Connect Express сам проводить KYC (перевірка особи) і зберігає рахунок/картку — платформа банківських даних не зберігає.",
    ])
    h2("5.6 Вебхуки")
    p("Developers → Webhooks → Add endpoint. Потрібно ДВА ендпоінти на один URL (для різних джерел подій):")
    bullets([
        "Endpoint 1 («Your account») → URL: https://<backend>/api/v1/payments/webhooks/stripe. Події: payment_intent.succeeded, payment_intent.processing, payment_intent.payment_failed, payment_intent.canceled, charge.refunded, charge.dispute.created, setup_intent.succeeded, transfer.reversed.",
        "Endpoint 2 («Connected accounts») → той самий URL. Подія: account.updated.",
        "Скопіювати signing secret кожного ендпоінта (whsec_…).",
    ])
    h2("5.7 Змінні оточення Stripe")
    table(
        ["Змінна", "Значення"],
        [
            ["STRIPE_SECRET_KEY", "sk_test_… (потім sk_live_…)"],
            ["STRIPE_PUBLISHABLE_KEY", "pk_test_… (потім pk_live_…)"],
            ["STRIPE_WEBHOOK_SECRET", "whsec_… (endpoint «Your account»)"],
            ["STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_… (endpoint «Connected accounts»)"],
            ["STRIPE_MERCHANT_COUNTRY", "PL"],
            ["STRIPE_CONNECT_DEFAULT_COUNTRY", "PL"],
            ["STRIPE_MERCHANT_NAME", "Назва компанії / застосунку"],
        ],
        [72, 104],
    )

    # ═══ 6. App Store ═══
    h1("6. App Store (підписка)")
    h2("6.1 App Store Connect")
    bullets([
        "App Store Connect → створити підписку (Subscription Group → Subscription → продукт).",
        "Записати APPLE_BUNDLE_ID (bundle id застосунку) і APPLE_APP_ID (Apple ID застосунку, для Production).",
    ])
    h2("6.2 Server Notifications V2")
    bullets([
        "App Store Connect → App → App Information → App Store Server Notifications V2 → Production і Sandbox URL: https://<backend>/api/v1/subscriptions/apple/notifications.",
    ])
    h2("6.3 Кореневі сертифікати Apple")
    bullets([
        "Завантажити з apple.com/certificateauthority файли AppleRootCA-G3.cer і AppleIncRootCertificate.cer.",
        "Покласти в папку на сервері та вказати шлях у APPLE_ROOT_CERTS_DIR.",
    ])
    h2("6.4 Змінні оточення App Store")
    table(
        ["Змінна", "Значення"],
        [
            ["APPLE_BUNDLE_ID", "bundle id застосунку"],
            ["APPLE_APP_ID", "Apple ID застосунку (Production)"],
            ["APPLE_IAP_ENVIRONMENT", "Sandbox | Production"],
            ["APPLE_ROOT_CERTS_DIR", "шлях до папки з .cer"],
        ],
        [60, 116],
    )
    p(
        "Застосунок: під час покупки передає appAccountToken = id користувача; після покупки надсилає "
        "Transaction.jwsRepresentation на POST /subscriptions/apple."
    )

    # ═══ 7. Google Play ═══
    h1("7. Google Play (підписка)")
    h2("7.1 Play Console")
    bullets([
        "Play Console → створити підписку (Monetization → Products → Subscriptions).",
        "Записати GOOGLE_PLAY_PACKAGE_NAME (applicationId).",
    ])
    h2("7.2 Сервісний акаунт")
    bullets([
        "Google Cloud Console → створити Service Account, завантажити JSON-ключ.",
        "Play Console → Users and permissions → додати цей сервісний акаунт з доступом до фінансових даних і замовлень.",
        "Вміст JSON-ключа передати в GOOGLE_PLAY_SERVICE_ACCOUNT_JSON.",
    ])
    h2("7.3 RTDN (Real-time developer notifications)")
    bullets([
        "Play Console → Monetization setup → Real-time developer notifications → тема Pub/Sub.",
        "Налаштувати push-підписку на https://<backend>/api/v1/subscriptions/google/rtdn?token=<GOOGLE_RTDN_TOKEN>.",
        "GOOGLE_RTDN_TOKEN — свій випадковий секрет.",
    ])
    h2("7.4 Змінні оточення Google Play")
    table(
        ["Змінна", "Значення"],
        [
            ["GOOGLE_PLAY_PACKAGE_NAME", "applicationId застосунку"],
            ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "вміст JSON-ключа сервісного акаунта"],
            ["GOOGLE_RTDN_TOKEN", "випадковий секрет для RTDN"],
        ],
        [74, 102],
    )
    p(
        "Застосунок: setObfuscatedAccountId(id користувача) у покупці; після покупки — POST /subscriptions/google "
        "{ productId, purchaseToken }. Сервер сам підтверджує (acknowledge)."
    )

    # ═══ 8. Повний перелік змінних ═══
    h1("8. Повний перелік змінних оточення (бекенд)")
    table(
        ["Змінна", "Секція", "Призначення"],
        [
            ["STRIPE_SECRET_KEY", "Stripe", "секретний ключ сервера"],
            ["STRIPE_PUBLISHABLE_KEY", "Stripe", "публічний ключ для застосунку"],
            ["STRIPE_WEBHOOK_SECRET", "Stripe", "signing secret вебхуків (свій акаунт)"],
            ["STRIPE_CONNECT_WEBHOOK_SECRET", "Stripe", "signing secret (Connected accounts)"],
            ["STRIPE_MERCHANT_COUNTRY", "Stripe", "країна платформи (PL)"],
            ["STRIPE_CONNECT_DEFAULT_COUNTRY", "Stripe", "країна Connect за замовчуванням"],
            ["STRIPE_MERCHANT_NAME", "Stripe", "назва мерчанта в PaymentSheet"],
            ["APPLE_BUNDLE_ID", "App Store", "bundle id застосунку"],
            ["APPLE_APP_ID", "App Store", "Apple ID застосунку"],
            ["APPLE_IAP_ENVIRONMENT", "App Store", "Sandbox / Production"],
            ["APPLE_ROOT_CERTS_DIR", "App Store", "папка з кореневими .cer"],
            ["GOOGLE_PLAY_PACKAGE_NAME", "Google Play", "applicationId"],
            ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "Google Play", "JSON-ключ сервісного акаунта"],
            ["GOOGLE_RTDN_TOKEN", "Google Play", "секрет RTDN"],
            ["PUBLIC_BASE_URL", "загальне", "зовнішній URL бекенду (refresh/return)"],
        ],
        [58, 26, 92],
    )
    p(
        "Мобільний застосунок (збірка): EXPO_PUBLIC_STRIPE_APPLE_MERCHANT_ID (той самий Merchant ID). "
        "Після зміни Merchant ID потрібна НОВА збірка (нативний модуль Stripe)."
    )

    # ═══ 9. Тестування ═══
    h1("9. Тестування")
    h2("9.1 Картки (test mode)")
    bullets([
        "Успішна оплата: 4242 4242 4242 4242 (будь-яка майбутня дата, будь-який CVC).",
        "Відмова: 4000 0000 0000 0002 (declined).",
        "Потрібна 3-D Secure: 4000 0025 0000 3155.",
        "BLIK: тестові коди — документація Stripe → BLIK → Testing (валюта сім'ї має бути PLN).",
        "Connect: тестові дані онбордингу — документація Stripe Connect (Express).",
    ])
    h2("9.2 Валідація на сервері")
    bullets([
        "Підпис вебхука: надіслати подію з невірним секретом → 400 (bad signature).",
        "Ідемпотентність: надіслати ту саму подію двічі → фонд не подвоюється.",
        "Виплата понад доступне → 422 PAYOUT_EXCEEDS_AVAILABLE.",
        "Автопоповнення без картки → помилка PAYMENT_METHOD_REQUIRED.",
        "У проєкті вже є e2e-тести на фейковому Stripe (81 тест проходить): поповнення, виплата, автопоповнення, повернення, відмова Transfer.",
    ])
    h2("9.3 App Store / Google Play")
    bullets([
        "App Store: Sandbox-тестер у App Store Connect + APPLE_IAP_ENVIRONMENT=Sandbox.",
        "Google Play: ліцензійні тестери (Play Console → Testing) + testPurchase.",
    ])

    # ═══ 10. Юридичні аспекти ═══
    h1("10. Юридичні аспекти та ризики")
    bullets([
        "Перед запуском реальних грошей — обов'язкова консультація з юристом (ТЗ §20.2).",
        "Гроші між оплатою спонсора й виплатою лежать на балансі платформи в Stripe (separate charges and transfers).",
        "Stripe Connect бере KYC на себе, але договір із користувачами, податки й ліцензування (PSD2 / посередництво платежів) мають бути погоджені.",
        "Україну Stripe Connect не підтримує — для батьків в Україні виплати через Stripe недоступні.",
        "Оцінити з юристом, чи вважаються відео/кадри вправ даними про здоров'я (DPIA, GDPR).",
        "Умови використання й Політика конфіденційності — на 4 мовах (uk/ru/pl/en).",
    ])

    # ═══ 11. Чек-лист ═══
    h1("11. Чек-лист перед запуском у прод")
    bullets([
        "Замінити тестові ключі Stripe на live (sk_live_/pk_live_) і live signing secrets.",
        "Увімкнути в Stripe всі потрібні способи оплати (картки, Apple Pay, Google Pay, BLIK, PayPal).",
        "Підтвердити Apple Pay Merchant ID і домен; перевірити на реальному iPhone.",
        "Connect Express: активувати й протестувати онбординг + реальний Transfer.",
        "App Store: переключити на Production, завантажити кореневі сертифікати.",
        "Google Play: підключити сервісний акаунт до фінансових даних, налаштувати RTDN.",
        "Прогнати e2e-тести (npm test) і ручні сценарії з тестовими картками.",
        "Погодити з юристом договір, податки й ліцензування.",
        "Налаштувати моніторинг логів: stripe_error, payout_failed, auto_topup_failed, stripe_dispute.",
    ])

    pdf.output(OUT)
    print("PDF створено:", OUT)


if __name__ == "__main__":
    build()
