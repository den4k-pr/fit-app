import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DateTime } from 'luxon';
import sharp from 'sharp';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { readdirSync } from 'node:fs';
import { ExerciseMode, ProgramDurationType } from '../src/common/enums';
import { Family } from '../src/modules/families/entities/family.entity';
import { ALL_MIGRATIONS } from '../src/database/all-migrations';
import { EXERCISES_SEED } from '../src/database/seeds/exercises.seed-data';
import { Exercise } from '../src/modules/exercises/entities/exercise.entity';
import { ConsoleEmailProvider } from '../src/modules/email/providers/console-email.provider';
import { PushService } from '../src/modules/notifications/push.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { STRIPE_CLIENT } from '../src/modules/payments/stripe.client';
import { createFakeStripe, signedEvent } from './fake-stripe';
import { ConsoleSmsProvider } from '../src/modules/sms/providers/console-sms.provider';
import { ProgramExercise } from '../src/modules/programs/entities/program-exercise.entity';
import { Program } from '../src/modules/programs/entities/program.entity';
import { UserProgramAssignment } from '../src/modules/programs/entities/user-program-assignment.entity';
import { PurgePhotosTask } from '../src/modules/scheduler/purge-photos.task';
import { DaySessionsService } from '../src/modules/workouts/day-sessions.service';

const API = '/api/v1';
/** Справжній JPEG кадру (сервер складає з кадрів розкадровку для AI — випадкові байти він не декодує) */
let frameJpeg: Buffer;
/** Кадри «людини в русі»: темний силует зсувається вгору-вниз (однакові кадри безкоштовна перевірка відхиляє) */
let movingFrames: Buffer[];
const jpeg = (size = 2000) =>
  Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), randomBytes(size), Buffer.from([0xff, 0xd9])]);
const phone = (n: number) => `+485000000${String(n).padStart(2, '0')}`;

interface Session {
  access: string;
  refresh: string;
  id: string;
}

describe('Healthyflexy API (e2e: реальна PostgreSQL + локальне сховище кадрів)', () => {
  let app: NestExpressApplication;
  let db: DataSource;
  /** Програма з тими самими 4 базовими вправами (у тому ж порядку) на всі дні — заміна старого
   * глобального довідника вправ для тестів, які не стосуються самого модуля програм. */
  let baselineProgramId: string;
  const push = { sendToUser: vi.fn().mockResolvedValue(true) };
  const stripe = createFakeStripe();
  const http = () => request(app.getHttpServer());

  // ─── хелпери ───
  /**
   * Код із «листа»/«SMS»: у NODE_ENV=test консольні провайдери нічого не друкують, а кладуть останнє
   * повідомлення в «вихідні». Фіксованих тестових кодів більше немає — тест читає справжній випадковий код.
   */
  const codeIn = (text: string | undefined): string => {
    const found = /\b(\d{6})\b/.exec(text ?? '');
    if (!found) throw new Error(`no OTP code in message: ${text}`);
    return found[1];
  };
  const smsCode = (number: string) => codeIn(app.get(ConsoleSmsProvider).lastMessage(number));
  const emailCode = (email: string) =>
    codeIn(app.get(ConsoleEmailProvider).lastMessage(email)?.text);

  /** Слухачі подій працюють асинхронно після відповіді: чекаємо, поки умова стане правдою (до 3 с) */
  async function eventually(check: () => void): Promise<void> {
    const started = Date.now();
    for (;;) {
      try {
        check();
        return;
      } catch (error) {
        if (Date.now() - started > 3000) throw error;
        await new Promise((r) => setTimeout(r, 25));
      }
    }
  }

  async function login(number: string): Promise<Session> {
    await http().post(`${API}/auth/otp/request`).send({ phone: number }).expect(200);
    const res = await http()
      .post(`${API}/auth/otp/verify`)
      .send({ phone: number, code: smsCode(number) })
      .expect(200);
    return {
      access: res.body.tokens.accessToken,
      refresh: res.body.tokens.refreshToken,
      id: res.body.user.id,
    };
  }
  const authed = (s: Session) => ({ Authorization: `Bearer ${s.access}` });
  const get = (s: Session, path: string) => http().get(`${API}${path}`).set(authed(s));
  const post = (s: Session, path: string, body: object = {}) =>
    http().post(`${API}${path}`).set(authed(s)).send(body);
  const patch = (s: Session, path: string, body: object) =>
    http().patch(`${API}${path}`).set(authed(s)).send(body);
  const put = (s: Session, path: string, body: object) =>
    http().put(`${API}${path}`).set(authed(s)).send(body);

  const CONSENT = {
    termsAndPrivacyAccepted: true,
    disclaimerAccepted: true,
    doctorConsultationConfirmed: true,
  };

  async function register(n: number, role: 'child' | 'parent', name: string): Promise<Session> {
    const s = await login(phone(n));
    await post(s, '/users/me/consent', CONSENT).expect(200);
    await put(s, '/users/me/role', { role }).expect(200);
    await patch(s, '/users/me', { name, timezone: 'Europe/Warsaw', language: 'uk' }).expect(200);
    return s;
  }

  /** Призначає сім'ї базову e2e-програму (заміна старого глобального довідника вправ у тестах) */
  async function assignBaselineProgram(child: Session, familyId: string): Promise<void> {
    await db.getRepository(UserProgramAssignment).save(
      db.getRepository(UserProgramAssignment).create({
        familyId,
        programId: baselineProgramId,
        assignedById: child.id,
        startDate: new Date().toISOString().slice(0, 10),
        isActive: true,
      }),
    );
    // як і POST /programs/:id/assign: день складається з програми, а не з підбору ШІ
    await db
      .getRepository(Family)
      .update(familyId, { exerciseMode: ExerciseMode.MANUAL, selectedExerciseIds: [] });
  }

  /** Сім'я з планом на всі 7 днів (тест не залежить від дня тижня) */
  async function makeFamily(childN: number, parentN: number, names: [string, string]) {
    const child = await register(childN, 'child', names[0]);
    const parent = await register(parentN, 'parent', names[1]);
    const invite = await post(child, '/families/invites', { relationship: 'mom' }).expect(201);
    const joined = await post(parent, '/families/join', { code: invite.body.code }).expect(200);
    // Призначити програму ДО будь-якого patch плану: інакше freezeToday() заморозить сьогоднішній
    // день з exercisesTotal=0 (програми ще немає) і надалі його вже не перезапише (orIgnore).
    await assignBaselineProgram(child, joined.body.id as string);
    await patch(child, '/families/current/plan', {
      planDays: [1, 2, 3, 4, 5, 6, 7],
      rate: 5,
      currency: 'EUR',
    }).expect(200);
    return { child, parent, familyId: joined.body.id as string, code: invite.body.code as string };
  }

  async function uploadPhotos(
    parent: Session,
    sessionId: string,
    exerciseId: string,
    count: number,
    /** true — усі кадри однакові (нерухома камера) */
    still = false,
  ): Promise<string[]> {
    const frames = Array.from({ length: count }, () => ({
      contentType: 'image/jpeg',
      sizeBytes: 2005,
    }));
    const res = await post(parent, '/workouts/uploads', { sessionId, exerciseId, frames }).expect(
      200,
    );
    const uploads = res.body.uploads as Array<{
      uploadUrl: string;
      headers: Record<string, string>;
    }>;
    for (const [i, target] of uploads.entries()) {
      const url = new URL(target.uploadUrl);
      await http()
        .put(url.pathname + url.search)
        .set(target.headers)
        .send(still ? frameJpeg : movingFrames[i % movingFrames.length])
        .expect(200);
    }
    return (res.body.uploads as Array<{ photoKey: string }>).map((u) => u.photoKey);
  }

  beforeAll(async () => {
    frameJpeg = await sharp({
      create: { width: 360, height: 480, channels: 3, background: { r: 180, g: 140, b: 110 } },
    })
      .jpeg()
      .toBuffer();
    const figure = await sharp({
      create: { width: 120, height: 220, channels: 3, background: { r: 30, g: 30, b: 40 } },
    })
      .png()
      .toBuffer();
    movingFrames = await Promise.all(
      Array.from({ length: 24 }, (_, i) =>
        sharp({
          create: { width: 360, height: 480, channels: 3, background: { r: 180, g: 140, b: 110 } },
        })
          .composite([
            { input: figure, left: 120, top: 80 + Math.round(Math.abs(Math.sin(i / 2)) * 160) },
          ])
          .jpeg()
          .toBuffer(),
      ),
    );
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PushService)
      .useValue(push)
      .overrideProvider(STRIPE_CLIENT)
      .useValue(stripe)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      rawBody: true,
      logger: process.env.TEST_LOG ? ['log', 'error', 'warn'] : ['error'],
    });
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    await db.runMigrations();
    // базові e2e-вправи — активні (вимкнені вправи в день не потрапляють)
    await db.getRepository(Exercise).upsert(
      EXERCISES_SEED.map((e) => ({ ...e, isActive: true })),
      ['slug'],
    );

    const baseExercises = await db
      .getRepository(Exercise)
      .find({ where: { slug: In(EXERCISES_SEED.map((e) => e.slug)) } });
    const program = await db.getRepository(Program).save(
      db.getRepository(Program).create({
        slug: 'e2e-baseline',
        name: { uk: 'E2E базова', pl: 'E2E bazowa', en: 'E2E baseline' },
        description: null,
        durationType: ProgramDurationType.WEEK,
        isPreset: true,
        createdById: null,
      }),
    );
    await db.getRepository(ProgramExercise).save(
      EXERCISES_SEED.map((seed, i) => {
        const exercise = baseExercises.find((e) => e.slug === seed.slug);
        if (!exercise) throw new Error(`Seed exercise not found: ${seed.slug}`);
        return db.getRepository(ProgramExercise).create({
          programId: program.id,
          exerciseId: exercise.id,
          sortOrder: i + 1,
          targetReps: null,
          targetSeconds: null,
          planDays: [1, 2, 3, 4, 5, 6, 7],
        });
      }),
    );
    baselineProgramId = program.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('перевірка списку міграцій: ALL_MIGRATIONS містить усі файли', () => {
    const files = readdirSync(join(__dirname, '..', 'src', 'database', 'migrations')).filter((f) =>
      /^\d+-.*\.ts$/.test(f),
    );
    expect(ALL_MIGRATIONS).toHaveLength(files.length);
  });

  // ══════════════════════ авторизація ══════════════════════
  describe('авторизація', () => {
    it('/health і захист маршрутів', async () => {
      await http().get('/health').expect(200);
      const none = await http().get(`${API}/users/me`).expect(401);
      expect(none.body.code).toBe('UNAUTHORIZED');
      const bad = await http()
        .get(`${API}/users/me`)
        .set('Authorization', 'Bearer nonsense')
        .expect(401);
      expect(bad.body.code).toBe('UNAUTHORIZED');
    });

    it('валідація: погане тіло → VALIDATION_FAILED з details', async () => {
      const res = await http().post(`${API}/auth/otp/request`).send({ phone: '123' }).expect(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.details.phone).toBeDefined();
      const extra = await http()
        .post(`${API}/auth/otp/request`)
        .send({ phone: phone(7), hack: 1 })
        .expect(400);
      expect(extra.body.code).toBe('VALIDATION_FAILED');
    });

    it('OTP: cooldown 60 с, невірний код, ліміт спроб', async () => {
      const n = phone(10);
      await http().post(`${API}/auth/otp/request`).send({ phone: n }).expect(200);
      const cooldown = await http().post(`${API}/auth/otp/request`).send({ phone: n }).expect(429);
      expect(cooldown.body.code).toBe('OTP_COOLDOWN');
      for (let i = 0; i < 4; i += 1) {
        const bad = await http()
          .post(`${API}/auth/otp/verify`)
          .send({ phone: n, code: '000000' })
          .expect(401);
        expect(bad.body.code).toBe('OTP_INVALID');
      }
      const exhausted = await http()
        .post(`${API}/auth/otp/verify`)
        .send({ phone: n, code: '000000' })
        .expect(429);
      expect(exhausted.body.code).toBe('OTP_TOO_MANY_ATTEMPTS');
      // навіть правильний код після вичерпання спроб не приймається
      const right = await http()
        .post(`${API}/auth/otp/verify`)
        .send({ phone: n, code: smsCode(n) })
        .expect(429);
      expect(right.body.code).toBe('OTP_TOO_MANY_ATTEMPTS');
    });

    it('OTP одноразовий; новий користувач isNewUser, повторний вхід — ні', async () => {
      const n = phone(11);
      await http().post(`${API}/auth/otp/request`).send({ phone: n }).expect(200);
      const first = await http()
        .post(`${API}/auth/otp/verify`)
        .send({ phone: n, code: smsCode(n) })
        .expect(200);
      expect(first.body.isNewUser).toBe(true);
      const reuse = await http()
        .post(`${API}/auth/otp/verify`)
        .send({ phone: n, code: smsCode(n) })
        .expect(410);
      expect(reuse.body.code).toBe('OTP_EXPIRED');
      // імітуємо, що минула хвилина: cooldown рахується від createdAt
      await db.query(
        `UPDATE otp_codes SET created_at = now() - interval '2 minutes' WHERE target = $1`,
        [n],
      );
      await http().post(`${API}/auth/otp/request`).send({ phone: n }).expect(200);
      const second = await http()
        .post(`${API}/auth/otp/verify`)
        .send({ phone: n, code: smsCode(n) })
        .expect(200);
      expect(second.body.isNewUser).toBe(false);
    });

    it('refresh: ротація; повторне використання старого токена відкликає всі', async () => {
      const s = await login(phone(12));
      const rotated = await http()
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: s.refresh })
        .expect(200);
      expect(rotated.body.refreshToken).not.toBe(s.refresh);
      await http()
        .get(`${API}/users/me`)
        .set('Authorization', `Bearer ${rotated.body.accessToken}`)
        .expect(200);

      const reuse = await http()
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: s.refresh })
        .expect(401);
      expect(reuse.body.code).toBe('REFRESH_TOKEN_INVALID');
      // токен-нащадок теж відкликано (можлива крадіжка)
      const child = await http()
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: rotated.body.refreshToken })
        .expect(401);
      expect(child.body.code).toBe('REFRESH_TOKEN_INVALID');
    });

    it('SMS лише на дозволені країни (антишахрайство, ТЗ §5.4)', async () => {
      const de = await http()
        .post(`${API}/auth/otp/request`)
        .send({ phone: '+4915112345678' })
        .expect(422);
      expect(de.body.code).toBe('PHONE_COUNTRY_NOT_ALLOWED');
      const ua = await http()
        .post(`${API}/auth/otp/request`)
        .send({ phone: '+380501234567' })
        .expect(200);
      expect(ua.body.retryAfterSeconds).toBe(60);
    });

    it('logout-all відкликає токени всіх сесій користувача', async () => {
      const s = await login(phone(20));
      const other = await http()
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: s.refresh })
        .expect(200);
      await post(s, '/auth/logout-all').expect(200);
      const gone = await http()
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: other.body.refreshToken })
        .expect(401);
      expect(gone.body.code).toBe('REFRESH_TOKEN_INVALID');
    });

    it('вхід лише з кодом: /auth/config показує способи входу, входу без коду немає', async () => {
      const config = await http().get(`${API}/auth/config`).expect(200);
      expect(config.body).toEqual({
        otpRequired: true,
        emailEnabled: true,
        phoneEnabled: true,
        googleEnabled: false,
      });
      await http()
        .post(`${API}/auth/phone-login`)
        .send({ phone: phone(9) })
        .expect(404);
    });

    it('вебхук статусу Twilio вимкнений, коли SMS_PROVIDER=console', async () => {
      await http()
        .post(`${API}/sms/twilio-status`)
        .type('form')
        .send({ MessageSid: 'SM1', MessageStatus: 'delivered' })
        .expect(404);
    });

    it('logout відкликає токен', async () => {
      const s = await login(phone(13));
      await post(s, '/auth/logout', { refreshToken: s.refresh }).expect(200);
      await http().post(`${API}/auth/refresh`).send({ refreshToken: s.refresh }).expect(401);
    });
  });

  // ══════════════════════ вхід за поштою ══════════════════════
  describe('вхід за електронною поштою', () => {
    const TEST_EMAIL = 'child1@example.com';

    it('валідація: погана адреса → 400', async () => {
      const res = await http()
        .post(`${API}/auth/email/request`)
        .send({ email: 'not-an-email' })
        .expect(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.details.email).toBeDefined();
    });

    it('пошта: cooldown, невірний код, вхід кодом із листа підтверджує пошту; регістр адреси не важить', async () => {
      const first = await http()
        .post(`${API}/auth/email/request`)
        .send({ email: ' Child1@Example.COM ' })
        .expect(200);
      expect(first.body).toEqual({ retryAfterSeconds: 60, expiresInSeconds: 300 });
      const cooldown = await http()
        .post(`${API}/auth/email/request`)
        .send({ email: TEST_EMAIL })
        .expect(429);
      expect(cooldown.body.code).toBe('OTP_COOLDOWN');
      const bad = await http()
        .post(`${API}/auth/email/verify`)
        .send({ email: TEST_EMAIL, code: '000000' })
        .expect(401);
      expect(bad.body.code).toBe('OTP_INVALID');

      const ok = await http()
        .post(`${API}/auth/email/verify`)
        .send({ email: 'CHILD1@example.com', code: emailCode(TEST_EMAIL) })
        .expect(200);
      expect(ok.body.isNewUser).toBe(true);
      expect(ok.body.user).toMatchObject({ email: TEST_EMAIL, phone: null, emailVerified: true });
      // лист справді «надіслано»: брендований, з кодом і текстовою версією
      const mail = app.get(ConsoleEmailProvider).lastMessage(TEST_EMAIL);
      expect(mail?.subject).toContain('Книжка турботи');
      expect(mail?.html).toContain(emailCode(TEST_EMAIL));
      const me = await http()
        .get(`${API}/users/me`)
        .set('Authorization', `Bearer ${ok.body.tokens.accessToken}`)
        .expect(200);
      expect(me.body).toMatchObject({ email: TEST_EMAIL, phone: null });
      const reuse = await http()
        .post(`${API}/auth/email/verify`)
        .send({ email: TEST_EMAIL, code: emailCode(TEST_EMAIL) })
        .expect(410);
      expect(reuse.body.code).toBe('OTP_EXPIRED');
    });

    it('повторний вхід дає той самий акаунт; далі згода й роль як у телефона', async () => {
      await db.query(
        `UPDATE otp_codes SET created_at = now() - interval '2 minutes' WHERE target = $1`,
        [TEST_EMAIL],
      );
      await http().post(`${API}/auth/email/request`).send({ email: TEST_EMAIL }).expect(200);
      const again = await http()
        .post(`${API}/auth/email/verify`)
        .send({ email: TEST_EMAIL, code: emailCode(TEST_EMAIL) })
        .expect(200);
      expect(again.body.isNewUser).toBe(false);

      const s: Session = {
        access: again.body.tokens.accessToken,
        refresh: again.body.tokens.refreshToken,
        id: again.body.user.id,
      };
      await post(s, '/users/me/consent', CONSENT).expect(200);
      const role = await put(s, '/users/me/role', { role: 'child' }).expect(200);
      expect(role.body).toMatchObject({ role: 'child', email: TEST_EMAIL });
    });

    it('пошта й телефон це різні акаунти; будь-яка адреса отримує свій випадковий код', async () => {
      const byPhone = await login(phone(24));
      expect(byPhone.id).toBeDefined();
      await http()
        .post(`${API}/auth/email/request`)
        .send({ email: 'someone@example.org' })
        .expect(200);
      const ok = await http()
        .post(`${API}/auth/email/verify`)
        .send({ email: 'someone@example.org', code: emailCode('someone@example.org') })
        .expect(200);
      expect(ok.body.user.id).not.toBe(byPhone.id);
      expect(ok.body.user.emailVerified).toBe(true);
    });
  });

  // ══════════════════════ профіль ══════════════════════
  describe('профіль і ролі', () => {
    it('роль без згоди → CONSENT_REQUIRED; роль обирається один раз; ROLE_REQUIRED без ролі', async () => {
      const s = await login(phone(14));
      const noRole = await get(s, '/workouts/today').expect(403);
      expect(noRole.body.code).toBe('ROLE_REQUIRED');
      const noConsent = await put(s, '/users/me/role', { role: 'child' }).expect(403);
      expect(noConsent.body.code).toBe('CONSENT_REQUIRED');
      await post(s, '/users/me/consent', { ...CONSENT, doctorConsultationConfirmed: false }).expect(
        400,
      );
      await post(s, '/users/me/consent', CONSENT).expect(200);
      const me = await put(s, '/users/me/role', { role: 'child' }).expect(200);
      expect(me.body.role).toBe('child');
      // «Назад» під час реєстрації: поки немає сім'ї, роль можна виправити; та сама роль — без змін
      await put(s, '/users/me/role', { role: 'child' }).expect(200);
      const changed = await put(s, '/users/me/role', { role: 'parent' }).expect(200);
      expect(changed.body.role).toBe('parent');
      await put(s, '/users/me/role', { role: 'child' }).expect(200);
    });

    it("роль остаточна, щойно є сім'я", async () => {
      const { child, parent } = await makeFamily(41, 42, ['Роль', 'Мама ролі']);
      const c = await put(child, '/users/me/role', { role: 'parent' }).expect(409);
      expect(c.body.code).toBe('ROLE_ALREADY_SET');
      const p = await put(parent, '/users/me/role', { role: 'child' }).expect(409);
      expect(p.body.code).toBe('ROLE_ALREADY_SET');
    });

    it('оновлення профілю та push-токена; чужа роль → FORBIDDEN_ROLE', async () => {
      const s = await register(15, 'child', 'Оля');
      const upd = await patch(s, '/users/me', {
        age: 34,
        language: 'pl',
        pushEnabled: false,
      }).expect(200);
      expect(upd.body).toMatchObject({ age: 34, language: 'pl', pushEnabled: false, name: 'Оля' });
      await patch(s, '/users/me', { age: 5 }).expect(400);
      await put(s, '/users/me/push-token', { pushToken: 'ExponentPushToken[abc]' }).expect(200);
      const denied = await get(s, '/workouts/today').expect(403);
      expect(denied.body.code).toBe('FORBIDDEN_ROLE');
    });
  });

  // ══════════════════════ сім'я, вправи, гроші ══════════════════════
  describe("повний цикл сім'ї (Андрій ↔ Олена)", () => {
    let child: Session;
    let parent: Session;
    let familyId: string;
    let sessionId: string;
    let exIds: string[];
    let recordWithPhotos: string;
    let photoKeys: string[];

    it('запрошення → приєднання; повторні спроби відхиляються', async () => {
      child = await register(1, 'child', 'Андрій');
      parent = await register(2, 'parent', 'Олена');
      const invite = await post(child, '/families/invites', { relationship: 'mom' }).expect(201);
      expect(invite.body.code).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);
      expect(invite.body.deepLink).toBe(`healthyflexy://join/${invite.body.code}`);
      const active = await get(child, '/families/invites/active').expect(200);
      expect(active.body.code).toBe(invite.body.code);

      // новий код знецінює попередній
      const invite2 = await post(child, '/families/invites', { relationship: 'grandma' }).expect(
        201,
      );
      const oldCode = await post(parent, '/families/join', { code: invite.body.code }).expect(404);
      expect(oldCode.body.code).toBe('INVITE_INVALID');
      const wrong = await post(parent, '/families/join', { code: 'AAAAAA' }).expect(404);
      expect(wrong.body.code).toBe('INVITE_INVALID');
      const byChild = await post(child, '/families/join', { code: invite2.body.code }).expect(403);
      expect(byChild.body.code).toBe('FORBIDDEN_ROLE');

      const joined = await post(parent, '/families/join', { code: invite2.body.code }).expect(200);
      familyId = joined.body.id;
      expect(joined.body).toMatchObject({
        relationship: 'grandma',
        myRole: 'parent',
        rate: 5,
        currency: 'EUR',
        reminderTime: '10:00',
      });
      expect(joined.body.counterpart).toMatchObject({ name: 'Андрій', role: 'child' });

      const used = await post(parent, '/families/join', { code: invite2.body.code }).expect(409);
      expect(['INVITE_USED', 'ALREADY_IN_FAMILY']).toContain(used.body.code);
      // дитина може мати кілька батьків: наступне запрошення — ще одна сім'я (з підписом і стартовою ставкою)
      const another = await post(child, '/families/invites', {
        relationship: 'mom',
        parentLabel: 'Мама',
        rate: 6,
      }).expect(201);
      expect(another.body).toMatchObject({ relationship: 'mom' });

      const fam = await get(child, '/families/current').expect(200);
      expect(fam.body).toMatchObject({
        myRole: 'child',
        counterpart: { name: 'Олена', role: 'parent' },
      });

      await assignBaselineProgram(child, familyId);
    });

    it('план: валідація і застосування', async () => {
      await patch(child, '/families/current/plan', { rate: 7.3 }).expect(400);
      await patch(child, '/families/current/plan', { planDays: [] }).expect(400);
      await patch(child, '/families/current/plan', { reminderTime: '25:00' }).expect(400);
      await patch(parent, '/families/current/plan', { rate: 6 }).expect(403);
      const ok = await patch(child, '/families/current/plan', {
        planDays: [1, 2, 3, 4, 5, 6, 7],
        rate: 5,
        reminderTime: '09:30',
      }).expect(200);
      expect(ok.body).toMatchObject({
        planDays: [1, 2, 3, 4, 5, 6, 7],
        reminderTime: '09:30',
        rate: 5,
      });
    });

    it('«Сьогодні»: 4 вправи, усі доступні (порядок не важливий); день створюється один раз', async () => {
      const res = await get(parent, '/workouts/today').expect(200);
      expect(res.body.restDay).toBe(false);
      expect(res.body.session).toMatchObject({
        status: 'pending',
        exercisesDone: 0,
        exercisesTotal: 4,
        rate: 5,
      });
      expect(res.body.exercises.map((e: { state: string }) => e.state)).toEqual([
        'current',
        'current',
        'current',
        'current',
      ]);
      expect(res.body.exercises[0].name).toBe('Присідання біля стільця');
      expect(res.body).toMatchObject({ owed: 0, streak: 0, currency: 'EUR' });
      sessionId = res.body.session.id;
      exIds = res.body.exercises.map((e: { exerciseId: string }) => e.exerciseId);
      const again = await get(parent, '/workouts/today').expect(200);
      expect(again.body.session.id).toBe(sessionId);
    });

    it('кадри: підписані URL, підпис і ліміти локального сховища', async () => {
      const res = await post(parent, '/workouts/uploads', {
        sessionId,
        exerciseId: exIds[0],
        frames: [
          { contentType: 'image/jpeg', sizeBytes: 2005 },
          { contentType: 'image/jpeg', sizeBytes: 2005 },
          { contentType: 'image/jpeg', sizeBytes: 2005 },
        ],
      }).expect(200);
      expect(res.body.uploads).toHaveLength(3);
      expect(res.body.uploads[0].photoKey).toBe(`${familyId}/${sessionId}/${exIds[0]}/1.jpg`);
      expect(res.body.maxBytes).toBe(1024 * 1024);

      // валідація запиту
      await post(parent, '/workouts/uploads', {
        sessionId,
        exerciseId: exIds[0],
        frames: [],
      }).expect(400);
      await post(parent, '/workouts/uploads', {
        sessionId,
        exerciseId: exIds[0],
        frames: Array(25).fill({ contentType: 'image/jpeg', sizeBytes: 100 }),
      }).expect(400);
      await post(parent, '/workouts/uploads', {
        sessionId,
        exerciseId: exIds[0],
        frames: [{ contentType: 'video/mp4', sizeBytes: 100 }],
      }).expect(400);
      // порядок вправ не важливий: кадри можна готувати для будь-якої вправи дня
      await post(parent, '/workouts/uploads', {
        sessionId,
        exerciseId: exIds[1],
        frames: [{ contentType: 'image/jpeg', sizeBytes: 100 }],
      }).expect(200);

      const target = res.body.uploads[0];
      const url = new URL(target.uploadUrl);
      // підроблений підпис
      const tampered = await http()
        .put(
          `${url.pathname}?${url.searchParams.toString().replace(/sig=[0-9a-f]{4}/, 'sig=0000')}`,
        )
        .set(target.headers)
        .send(jpeg())
        .expect(403);
      expect(tampered.body.code).toBe('STORAGE_SIGNATURE_INVALID');
      // інший ключ із тим самим підписом
      const other = new URL(target.uploadUrl);
      other.searchParams.set('key', `${familyId}/${sessionId}/${exIds[0]}/2.jpg`);
      await http()
        .put(other.pathname + other.search)
        .set(target.headers)
        .send(jpeg())
        .expect(403);
      // path traversal
      const evil = new URL(target.uploadUrl);
      evil.searchParams.set('key', '../../etc/passwd');
      await http()
        .put(evil.pathname + evil.search)
        .set(target.headers)
        .send(jpeg())
        .expect(403);
      // не JPEG
      const badType = await http()
        .put(url.pathname + url.search)
        .set('Content-Type', 'video/mp4')
        .send(jpeg())
        .expect(415);
      expect(badType.body.code).toBe('PHOTO_TYPE_NOT_ALLOWED');
      // завеликий файл (> 1 МБ)
      const huge = await http()
        .put(url.pathname + url.search)
        .set(target.headers)
        .send(Buffer.alloc(1024 * 1024 + 10))
        .expect(413);
      expect(huge.body.code).toBe('PHOTO_TOO_LARGE');
      // сховище без JWT, але з підписом: коректний PUT
      await http()
        .put(url.pathname + url.search)
        .set(target.headers)
        .send(jpeg())
        .expect(200);
    });

    it('complete: порядок, відсутні/чужі кадри, ідемпотентність', async () => {
      // зарахування «без фото» більше немає: порожній список кадрів відхиляється ще до перевірки порядку
      const noPhotos = await post(parent, `/workouts/${sessionId}/exercises/${exIds[1]}/complete`, {
        photoKeys: [],
      }).expect(422);
      expect(noPhotos.body.code).toBe('PHOTOS_REQUIRED');

      const notUploaded = await post(
        parent,
        `/workouts/${sessionId}/exercises/${exIds[0]}/complete`,
        { photoKeys: [`${familyId}/${sessionId}/${exIds[0]}/3.jpg`] },
      ).expect(422);
      expect(notUploaded.body.code).toBe('PHOTO_KEY_INVALID');
      const foreign = await post(parent, `/workouts/${sessionId}/exercises/${exIds[0]}/complete`, {
        photoKeys: [`${familyId}/${sessionId}/${exIds[1]}/1.jpg`],
      }).expect(422);
      expect(foreign.body.code).toBe('PHOTO_KEY_INVALID');
      const cross = await post(child, `/workouts/${sessionId}/exercises/${exIds[0]}/complete`, {
        photoKeys: [],
      }).expect(403);
      expect(cross.body.code).toBe('FORBIDDEN_ROLE');

      // замало кадрів для надійного аналізу (камера збоїла) → відмова без виклику AI
      const tooFew = await uploadPhotos(parent, sessionId, exIds[0], 3);
      const few = await post(parent, `/workouts/${sessionId}/exercises/${exIds[0]}/complete`, {
        photoKeys: tooFew,
      }).expect(422);
      expect(few.body.code).toBe('PHOTOS_REQUIRED');

      photoKeys = await uploadPhotos(parent, sessionId, exIds[0], 24);
      const done = await post(parent, `/workouts/${sessionId}/exercises/${exIds[0]}/complete`, {
        photoKeys,
      }).expect(200);
      // нарахування за КОЖНУ вправу: €5 / 4 вправи = €1.25
      expect(done.body).toMatchObject({ dayCompleted: false, earned: 1.25 });
      expect(done.body.record).toMatchObject({ photoCount: 24, steps: null, photosDeleted: false });
      expect(done.body.session).toMatchObject({ exercisesDone: 1, status: 'in_progress' });
      recordWithPhotos = done.body.record.id;

      const repeat = await post(parent, `/workouts/${sessionId}/exercises/${exIds[0]}/complete`, {
        photoKeys,
      }).expect(200);
      expect(repeat.body.record.id).toBe(recordWithPhotos);
      expect(repeat.body.session.exercisesDone).toBe(1);
    });

    it('остання вправа завершує день: частки ставки за кожну вправу, сума = ставка', async () => {
      await post(parent, `/workouts/${sessionId}/exercises/${exIds[1]}/complete`, {
        photoKeys: await uploadPhotos(parent, sessionId, exIds[1], 24),
      }).expect(200);

      // кадри + зарахування одним multipart-запитом
      const multipart = (exerciseId: string, count: number, type = 'image/jpeg') => {
        let r = http()
          .post(`${API}/workouts/${sessionId}/exercises/${exerciseId}/complete-frames`)
          .set('Authorization', `Bearer ${parent.access}`)
          .field('frameTimes', JSON.stringify(Array.from({ length: count }, (_, i) => i)));
        for (let i = 0; i < count; i += 1)
          r = r.attach('frames', movingFrames[i % movingFrames.length], {
            filename: `${i + 1}.jpg`,
            contentType: type,
          });
        return r;
      };
      await multipart(exIds[2], 12, 'image/png').expect(415);
      const few = await multipart(exIds[2], 3).expect(422);
      expect(few.body.code).toBe('PHOTOS_REQUIRED');
      const viaMultipart = await multipart(exIds[2], 24).expect(200);
      expect(viaMultipart.body).toMatchObject({ accepted: true, earned: 1.25 });
      expect(viaMultipart.body.record).toMatchObject({ photoCount: 24 });
      // повтор (відповідь загубилась) — той самий запис без повторного нарахування
      const retried = await multipart(exIds[2], 24).expect(200);
      expect(retried.body.record.id).toBe(viaMultipart.body.record.id);
      expect(retried.body.earned).toBe(0);

      const last = await post(parent, `/workouts/${sessionId}/exercises/${exIds[3]}/complete`, {
        photoKeys: await uploadPhotos(parent, sessionId, exIds[3], 24),
      }).expect(200);
      expect(last.body).toMatchObject({ dayCompleted: true, earned: 1.25 });
      expect(last.body.session).toMatchObject({ status: 'completed', exercisesDone: 4, earned: 5 });

      const again = await post(parent, `/workouts/${sessionId}/exercises/${exIds[3]}/complete`, {
        photoKeys: [],
      }).expect(200);
      expect(again.body.earned).toBe(0);
      const today = await get(parent, '/workouts/today').expect(200);
      expect(today.body).toMatchObject({ owed: 5, streak: 1 });
      expect(today.body.exercises.every((e: { state: string }) => e.state === 'done')).toBe(true);

      const earns = await db.query(
        `SELECT count(*)::int AS n FROM ledger_entries WHERE session_id = $1 AND type = 'earn'`,
        [sessionId],
      );
      expect(earns[0].n).toBe(4); // по одному earn на кожну вправу, повтори нічого не додали
      const late = await post(parent, `/workouts/${sessionId}/exercises/${exIds[0]}/complete`, {
        photoKeys: [],
      }).expect(200);
      expect(late.body.dayCompleted).toBe(false); // ідемпотентно, без нових нарахувань
    });

    it("push: дитині — «вправи виконано» мовою одержувача, з ім'ям батька/матері", async () => {
      await eventually(() => {
        const calls = push.sendToUser.mock.calls.filter(
          ([, m]) => m.data.event === 'parent_day_completed',
        );
        expect(calls).toHaveLength(1);
        expect(calls[0][0]).toBe(child.id);
        expect(calls[0][1]).toMatchObject({
          title: 'Вправи виконано ✅',
          data: { screen: 'child.dashboard', familyId },
        });
        expect(calls[0][1].body).toContain('Олена');
      });
    });

    it('дитина: статистика, календар, день, кадри (URL працюють), видалені/відсутні', async () => {
      const stats = await get(child, '/families/current/stats').expect(200);
      expect(stats.body).toMatchObject({
        earnedTotal: 5,
        settledTotal: 0,
        pendingTotal: 0,
        owed: 5,
        daysCompleted: 1,
        currentStreak: 1,
        completionPct: 100,
      });

      const month = DateTime.now().setZone('Europe/Warsaw').toFormat('yyyy-MM');
      const today = DateTime.now().setZone('Europe/Warsaw').toISODate() as string;
      const cal = await get(child, `/workouts/calendar?month=${month}`).expect(200);
      expect(cal.body.todayDate).toBe(today);
      expect(cal.body.days.find((d: { date: string }) => d.date === today)).toMatchObject({
        status: 'completed',
        exercisesDone: 4,
      });
      await get(child, '/workouts/calendar?month=2026-13').expect(400);

      const day = await get(child, `/workouts/days/${today}`).expect(200);
      expect(day.body.records.map((r: { photoCount: number }) => r.photoCount)).toEqual([
        24, 24, 24, 24,
      ]);
      // батько/мати теж бачить деталі дня (журнал → деталі нарахування) з оцінкою AI і «впливом на організм»
      const parentDay = await get(parent, `/workouts/days/${today}`).expect(200);
      expect(parentDay.body.records[0]).toMatchObject({
        aiScore: 90,
        info: { durationMin: expect.any(Number), bodyImpact: expect.any(Object) },
      });

      // тиждень одним запитом: ті самі дані, що й по днях; дні без запису відсутні
      const weekAgo = DateTime.fromISO(today).minus({ days: 6 }).toISODate();
      const week = await get(child, `/workouts/days?from=${weekAgo}&to=${today}`).expect(200);
      expect(week.body).toHaveLength(1);
      expect(week.body[0]).toEqual(day.body);
      await get(child, `/workouts/days?from=${today}&to=${weekAgo}`).expect(400);
      await get(child, `/workouts/days?from=2026-01-01&to=2026-03-01`).expect(400);
      await get(child, `/workouts/days?from=bad&to=${today}`).expect(400);

      const photos = await get(child, `/workouts/records/${recordWithPhotos}/photos`).expect(200);
      expect(photos.body.photos.map((p: { index: number }) => p.index)).toEqual(
        Array.from({ length: 24 }, (_, i) => i + 1),
      );
      for (const p of photos.body.photos as Array<{ url: string }>) {
        const u = new URL(p.url);
        const file = await http()
          .get(u.pathname + u.search)
          .buffer(true)
          .parse((res, cb) => {
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => cb(null, Buffer.concat(chunks)));
          })
          .expect(200);
        expect(file.headers['content-type']).toContain('image/jpeg');
        expect((file.body as Buffer).length).toBeGreaterThan(1000);
      }
      // read-URL не працює як upload і навпаки
      const readUrl = new URL(photos.body.photos[0].url);
      await http()
        .put(readUrl.pathname + readUrl.search)
        .set('Content-Type', 'image/jpeg')
        .send(jpeg())
        .expect(403);

      await get(parent, `/workouts/records/${recordWithPhotos}/photos`).expect(403);
    });

    it('переказ: межі, блокування паралельних запитів, підтвердження, відхилення', async () => {
      const over = await post(child, '/ledger/settlements', { amount: 5.5 }).expect(422);
      expect(over.body.code).toBe('SETTLEMENT_EXCEEDS_OWED');
      await post(child, '/ledger/settlements', { amount: 0 }).expect(400);
      await post(child, '/ledger/settlements', { amount: 1.234 }).expect(400);
      await post(parent, '/ledger/settlements', { amount: 1 }).expect(403);

      const first = await post(child, '/ledger/settlements', { amount: 3 }).expect(201);
      expect(first.body).toMatchObject({
        type: 'settlement',
        status: 'pending',
        amount: 3,
        createdBy: { name: 'Андрій' },
      });
      const exceeds = await post(child, '/ledger/settlements', { amount: 3 }).expect(422);
      expect(exceeds.body.code).toBe('SETTLEMENT_EXCEEDS_OWED');

      // 5 одночасних запитів на 2 € при доступних 2 € → рівно один успіх (FOR UPDATE на рядок сім'ї)
      const race = await Promise.all(
        Array.from({ length: 5 }, () => post(child, '/ledger/settlements', { amount: 2 })),
      );
      expect(race.filter((r) => r.status === 201)).toHaveLength(1);
      expect(race.filter((r) => r.status === 422 || r.status === 409)).toHaveLength(4);
      const empty = await post(child, '/ledger/settlements', { amount: 1 }).expect(409);
      expect(empty.body.code).toBe('NOTHING_OWED');

      const s1 = await get(parent, '/families/current/stats').expect(200);
      expect(s1.body).toMatchObject({ owed: 5, pendingTotal: 5, settledTotal: 0 });

      // push батьку про переказ
      await eventually(() => {
        const created = push.sendToUser.mock.calls.filter(
          ([, m]) => m.data.event === 'settlement_created',
        );
        expect(created.length).toBeGreaterThanOrEqual(2);
        expect(created[0][0]).toBe(parent.id);
      });

      const ok = await post(parent, `/ledger/settlements/${first.body.id}/resolve`, {
        accept: true,
      }).expect(200);
      expect(ok.body).toMatchObject({ status: 'confirmed' });
      expect(ok.body.resolvedAt).not.toBeNull();
      const twice = await post(parent, `/ledger/settlements/${first.body.id}/resolve`, {
        accept: false,
      }).expect(409);
      expect(twice.body.code).toBe('SETTLEMENT_NOT_PENDING');
      await post(child, `/ledger/settlements/${first.body.id}/resolve`, { accept: true }).expect(
        403,
      );

      const second = race.find((r) => r.status === 201)!;
      const rejected = await post(parent, `/ledger/settlements/${second.body.id}/resolve`, {
        accept: false,
      }).expect(200);
      expect(rejected.body.status).toBe('rejected');

      const stats = await get(child, '/families/current/stats').expect(200);
      expect(stats.body).toMatchObject({
        earnedTotal: 5,
        settledTotal: 3,
        pendingTotal: 0,
        owed: 2,
      });
      await eventually(() => {
        const confirmedPush = push.sendToUser.mock.calls.filter(
          ([, m]) => m.data.event === 'settlement_confirmed',
        );
        expect(confirmedPush[0][0]).toBe(child.id);
      });
    });

    it('журнал: курсорна пагінація без пропусків і дублів', async () => {
      const all = await get(child, '/ledger?limit=50').expect(200);
      expect(all.body.items.length).toBeGreaterThanOrEqual(3);
      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const page: request.Response = await get(
          parent,
          `/ledger?limit=1${cursor ? `&cursor=${cursor}` : ''}`,
        ).expect(200);
        seen.push(...page.body.items.map((i: { id: string }) => i.id));
        cursor = page.body.nextCursor;
      } while (cursor);
      expect(seen).toEqual(all.body.items.map((i: { id: string }) => i.id));
      expect(new Set(seen).size).toBe(seen.length);
      const earn = all.body.items.find((i: { type: string }) => i.type === 'earn');
      expect(earn).toMatchObject({
        amount: 1.25,
        status: 'confirmed',
        sessionDate: expect.any(String),
        exerciseRecordId: expect.any(String),
        exerciseName: expect.any(String),
      });
      const onlyEarn = await get(child, '/ledger?type=earn').expect(200);
      expect(onlyEarn.body.items.every((i: { type: string }) => i.type === 'earn')).toBe(true);
      await get(child, '/ledger?cursor=garbage').expect(400);
    });

    it('нагадування недоступне, коли день виконано', async () => {
      const status = await get(child, '/families/current/parent-status').expect(200);
      expect(status.body).toMatchObject({
        state: 'completed',
        canRemind: false,
        exercisesDone: 4,
        parentName: 'Олена',
      });
      const res = await post(child, '/families/current/reminders').expect(409);
      expect(res.body.code).toBe('REMINDER_NOT_ALLOWED');
    });

    it('закриття днів: пропущені створюються ідемпотентно, серія рахується за ТЗ §8.4', async () => {
      await db.query(`UPDATE families SET created_at = now() - interval '10 days' WHERE id = $1`, [
        familyId,
      ]);
      const sessions = app.get(DaySessionsService);
      const first = await sessions.closePastDays();
      expect(first.changed).toBeGreaterThanOrEqual(9);
      const second = await sessions.closePastDays();
      expect(second.changed).toBe(0);

      const missed = await db.query(
        `SELECT count(*)::int AS n FROM day_sessions WHERE family_id = $1 AND status = 'missed'`,
        [familyId],
      );
      expect(missed[0].n).toBeGreaterThanOrEqual(9);
      const stats = await get(child, '/families/current/stats').expect(200);
      expect(stats.body.currentStreak).toBe(1); // сьогодні виконано, вчора пропущено
      expect(stats.body.daysMissed).toBeGreaterThanOrEqual(9);
      expect(stats.body.completionPct).toBeLessThan(50);
    });

    it('видалення кадрів за строком: файли зникають, дитина бачить «фото видалено»', async () => {
      const root = process.env.STORAGE_LOCAL_DIR as string;
      expect(existsSync(join(root, photoKeys[0]))).toBe(true);
      await db.query(
        `UPDATE exercise_records SET photos_expires_at = now() - interval '1 minute' WHERE id = $1`,
        [recordWithPhotos],
      );
      const result = await app.get(PurgePhotosTask).run();
      expect(result.records).toBe(1);
      expect(existsSync(join(root, photoKeys[0]))).toBe(false);

      const gone = await get(child, `/workouts/records/${recordWithPhotos}/photos`).expect(410);
      expect(gone.body.code).toBe('PHOTOS_DELETED');
      const today = new Date().toISOString().slice(0, 10);
      const day = await get(
        child,
        `/workouts/days/${DateTime.now().setZone('Europe/Warsaw').toISODate()}`,
      ).expect(200);
      expect(day.body.records[0]).toMatchObject({ photoCount: 24, photosDeleted: true });
      expect(today).toBeDefined();
      // повторний запуск нічого не робить
      expect((await app.get(PurgePhotosTask).run()).records).toBe(0);
    });

    it("видалення акаунта (GDPR): дані, файли й сім'я зникають; друга сторона це бачить", async () => {
      const uploaded = await uploadPhotos(
        parent,
        (await get(parent, '/workouts/today').expect(200)).body.session.id,
        exIds[0],
        1,
      ).catch(() => null);
      expect(uploaded === null || Array.isArray(uploaded)).toBe(true); // день закритий → 409 (ок), головне не падати
      const root = process.env.STORAGE_LOCAL_DIR as string;
      const started = Date.now();
      await http().delete(`${API}/users/me`).set(authed(parent)).expect(200);
      // відповідь не чекає на сховище: файли прибираються у фоні
      expect(Date.now() - started).toBeLessThan(3000);
      await eventually(() => expect(existsSync(join(root, familyId))).toBe(false));
      await http().get(`${API}/users/me`).set(authed(parent)).expect(401);
      const fam = await get(child, '/families/current').expect(404);
      expect(fam.body.code).toBe('FAMILY_NOT_FOUND');
      const rows = await db.query(
        `SELECT (SELECT count(*)::int FROM day_sessions WHERE family_id = $1) AS s, (SELECT count(*)::int FROM ledger_entries WHERE family_id = $1) AS l`,
        [familyId],
      );
      expect(rows[0]).toEqual({ s: 0, l: 0 });
    });
  });

  // ══════════════════════ друга сім'я: заморожування дня, нагадування ══════════════════════
  describe("сім'я 2: зміни плану діють з наступного дня; нагадування", () => {
    it('дитина змінює ставку ДО першого відкриття «Сьогодні»: сьогодні лишається стара ставка', async () => {
      const { child, parent } = await makeFamily(4, 5, ['Ігор', 'Марія']);
      await patch(child, '/families/current/plan', { rate: 10 }).expect(200);
      const today = await get(parent, '/workouts/today').expect(200);
      expect(today.body.rate).toBe(5);
      expect(today.body.session.rate).toBe(5);
      const fam = await get(parent, '/families/current').expect(200);
      expect(fam.body.rate).toBe(10); // на завтра
    });

    it('нагадування: PARENT_HAS_NO_PUSH → дозволено → REMINDER_TOO_SOON (2 год)', async () => {
      const { child, parent } = await makeFamily(8, 9, ['Тарас', 'Галина']);
      const before = await get(child, '/families/current/parent-status').expect(200);
      expect(before.body).toMatchObject({ state: 'not_started', canRemind: false });
      const noPush = await post(child, '/families/current/reminders').expect(409);
      expect(noPush.body.code).toBe('PARENT_HAS_NO_PUSH');

      await put(parent, '/users/me/push-token', {
        pushToken: 'ExponentPushToken[parent-device]',
      }).expect(200);
      const status = await get(child, '/families/current/parent-status').expect(200);
      expect(status.body.canRemind).toBe(true);
      const sent = await post(child, '/families/current/reminders').expect(200);
      expect(
        new Date(sent.body.nextAllowedAt).getTime() - new Date(sent.body.sentAt).getTime(),
      ).toBe(2 * 3600_000);
      const soon = await post(child, '/families/current/reminders').expect(429);
      expect(soon.body.code).toBe('REMINDER_TOO_SOON');
      const after = await get(child, '/families/current/parent-status').expect(200);
      expect(after.body).toMatchObject({ canRemind: false });
      expect(after.body.nextReminderAllowedAt).not.toBeNull();

      await eventually(() => {
        const calls = push.sendToUser.mock.calls.filter(
          ([id, m]) => id === parent.id && m.data.event === 'reminder_from_child',
        );
        expect(calls).toHaveLength(1);
        expect(calls[0][1]).toMatchObject({
          title: 'Час для вправ!',
          data: { screen: 'parent.today' },
        });
        expect(calls[0][1].body).toContain('Тарас');
      });
    });

    it('ізоляція сімей: чужий session/record недоступні', async () => {
      const a = await makeFamily(16, 17, ['A', 'B']);
      const b = await makeFamily(18, 19, ['C', 'D']);
      const todayA = await get(a.parent, '/workouts/today').expect(200);
      const sessionA = todayA.body.session.id;
      const exA = todayA.body.exercises[0].exerciseId;
      const cross = await post(b.parent, `/workouts/${sessionA}/exercises/${exA}/complete`, {
        photoKeys: [],
      }).expect(404);
      expect(cross.body.code).toBe('NOT_FOUND');
      const crossUpload = await post(b.parent, '/workouts/uploads', {
        sessionId: sessionA,
        exerciseId: exA,
        frames: [{ contentType: 'image/jpeg', sizeBytes: 100 }],
      }).expect(404);
      expect(crossUpload.body.code).toBe('NOT_FOUND');
      const done = await post(a.parent, `/workouts/${sessionA}/exercises/${exA}/complete`, {
        photoKeys: await uploadPhotos(a.parent, sessionA, exA, 24),
      }).expect(200);
      await get(b.child, `/workouts/records/${done.body.record.id}/photos`).expect(404);

      // `b.child` призначала програму своїй сім'ї (makeFamily → assignBaselineProgram):
      // видалення акаунта НЕ повинно падати 500-кою на FK "assigned_by_id" (без нових OTP-реєстрацій).
      await http().delete(`${API}/users/me`).set(authed(b.child)).expect(200);
      await http().get(`${API}/users/me`).set(authed(b.child)).expect(401);
    });
  });

  // ══════════════════════ відповідність макету ══════════════════════
  describe('макет: кілька батьків, види навантаження, автоускладнення, активність, аватар', () => {
    let child: Session;
    let mom: Session;
    let dad: Session;
    let momFamily: string;
    let dadFamily: string;
    const asFamily = (s: Session, familyId: string, path: string) =>
      get(s, path).set('X-Family-Id', familyId);

    it('дитина додає другого батька: перемикач (X-Family-Id), підпис, власна ставка', async () => {
      const first = await makeFamily(25, 26, ['Оля', 'Ніна']);
      child = first.child;
      mom = first.parent;
      momFamily = first.familyId;
      dad = await register(27, 'parent', 'Петро');
      const invite = await post(child, '/families/invites', {
        relationship: 'dad',
        parentLabel: 'Тато',
        rate: 7.5,
      }).expect(201);
      const joined = await post(dad, '/families/join', { code: invite.body.code }).expect(200);
      dadFamily = joined.body.id;
      expect(joined.body).toMatchObject({ parentLabel: 'Тато', rate: 7.5, level: 1 });

      const list = await get(child, '/families').expect(200);
      expect(list.body.map((f: { id: string }) => f.id)).toEqual([momFamily, dadFamily]);

      // без заголовка — перша сім'я; із заголовком — обрана; чужий id ігнорується
      expect((await get(child, '/families/current').expect(200)).body.id).toBe(momFamily);
      expect((await asFamily(child, dadFamily, '/families/current').expect(200)).body.id).toBe(
        dadFamily,
      );
      expect((await asFamily(mom, dadFamily, '/families/current').expect(200)).body.id).toBe(
        momFamily,
      );

      const renamed = await patch(child, '/families/current', { parentLabel: 'Мамуся' })
        .set('X-Family-Id', momFamily)
        .expect(200);
      expect(renamed.body.parentLabel).toBe('Мамуся');
      const status = await asFamily(child, momFamily, '/families/current/parent-status').expect(
        200,
      );
      expect(status.body).toMatchObject({ parentLabel: 'Мамуся', parentAvatarUrl: null });
    });

    it('види навантаження й час тренування фільтрують склад дня (з наступного дня — план на дату)', async () => {
      await patch(child, '/families/current/plan', { workoutTypes: [], workoutMinutes: 7 })
        .set('X-Family-Id', momFamily)
        .expect(400);
      const saved = await patch(child, '/families/current/plan', {
        workoutTypes: ['breathing'],
        workoutMinutes: 10,
      })
        .set('X-Family-Id', momFamily)
        .expect(200);
      expect(saved.body).toMatchObject({ workoutTypes: ['breathing'], workoutMinutes: 10 });

      const tomorrow = DateTime.now().setZone('Europe/Warsaw').plus({ days: 1 }).toISODate();
      const plan = await asFamily(child, momFamily, `/workouts/plan/${tomorrow}`).expect(200);
      expect(plan.body.planned).toBe(true);
      expect(plan.body.exercises.map((e: { slug: string }) => e.slug)).toEqual(['breathing']);
      expect(plan.body.exercises[0].info).toMatchObject({
        workoutTypes: expect.arrayContaining(['breathing']),
        bodyImpact: expect.any(Object),
      });

      // сьогоднішній день уже зафіксований (знімок складу) — фільтр діє з наступного дня
      const today = await get(mom, '/workouts/today').expect(200);
      expect(today.body.exercises).toHaveLength(4);
      expect(today.body.exercises[0].info.muscles.length).toBeGreaterThan(0);
    });

    it('автоускладнення: цілі ростуть щотижня від дати ввімкнення, рівень 1–5', async () => {
      const on = await patch(child, '/families/current/plan', {
        workoutTypes: ['strength', 'cardio', 'breathing', 'coordination'],
        workoutMinutes: 30,
        autoProgression: true,
        progressionPct: 10,
      })
        .set('X-Family-Id', momFamily)
        .expect(200);
      expect(on.body).toMatchObject({ autoProgression: true, progressionPct: 10, level: 1 });

      const inFourWeeks = DateTime.now().setZone('Europe/Warsaw').plus({ weeks: 4 }).toISODate();
      const later = await asFamily(child, momFamily, `/workouts/plan/${inFourWeeks}`).expect(200);
      const squat = later.body.exercises.find((e: { slug: string }) => e.slug === 'chair-squat');
      expect(squat.targetReps).toBe(Math.round(10 * 1.1 ** 4)); // 10 повторень × 1.1⁴ ≈ 15

      await db.query(
        `UPDATE families SET progression_start_date = progression_start_date - 70 WHERE id = $1`,
        [momFamily],
      );
      const lvl = await asFamily(child, momFamily, '/families/current').expect(200);
      expect(lvl.body.level).toBeGreaterThan(1);
    });

    it('кроки: батько/мати синхронізує день, графік віддає відрізки періоду', async () => {
      const today = DateTime.now().setZone('Europe/Warsaw').toISODate() as string;
      await put(mom, '/activity/steps', { days: [{ date: today, steps: 4214 }] }).expect(200);
      await put(mom, '/activity/steps', { days: [{ date: today, steps: 1000 }] }).expect(200); // не зменшується
      await put(child, '/activity/steps', { days: [{ date: today, steps: 1 }] }).expect(403);

      const week = await asFamily(child, momFamily, '/activity?period=7').expect(200);
      expect(week.body.granularity).toBe('day');
      expect(week.body.buckets).toHaveLength(7);
      expect(week.body.buckets.at(-1)).toMatchObject({ from: today, steps: 4214 });
      const quarter = await get(mom, '/activity?period=90').expect(200);
      expect(quarter.body).toMatchObject({ granularity: 'week' });
      expect(quarter.body.buckets).toHaveLength(13);
      await get(mom, '/activity?period=5').expect(400);
    });

    it('фото-аватар: підписаний PUT → підтвердження → дитина бачить аватар батька', async () => {
      const upload = await post(mom, '/users/me/avatar/upload', { sizeBytes: 2005 }).expect(200);
      const url = new URL(upload.body.uploadUrl);
      await http()
        .put(url.pathname + url.search)
        .set(upload.body.headers)
        .send(jpeg())
        .expect(200);
      await put(mom, '/users/me/avatar', {
        avatarKey: `avatars/${dad.id}/${randomUUID()}.jpg`,
      }).expect(422);
      const me = await put(mom, '/users/me/avatar', { avatarKey: upload.body.avatarKey }).expect(
        200,
      );
      expect(me.body.avatarUrl).toEqual(expect.any(String));

      const status = await asFamily(child, momFamily, '/families/current/parent-status').expect(
        200,
      );
      expect(status.body.parentAvatarUrl).toEqual(expect.any(String));
      const removed = await http().delete(`${API}/users/me/avatar`).set(authed(mom)).expect(200);
      expect(removed.body.avatarUrl).toBeNull();
    });
  });

  describe('CRM: адмін-вхід з ENV, користувачі, довідник, пресети, ліміти, налаштування застосунку', () => {
    let admin: string;
    const as = (method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string) =>
      http()
        [method](`${API}/admin${path}`)
        .set({ Authorization: `Bearer ${admin}` });

    beforeAll(async () => {
      const res = await http()
        .post(`${API}/admin/auth/login`)
        .send({ email: 'ADMIN@Example.com', password: 'e2e-admin-password' })
        .expect(200);
      admin = res.body.accessToken;
      expect(res.body.refreshToken).toEqual(expect.any(String));
    });

    it('невірний пароль, користувацький токен і refresh замість access не пускають в адмінку', async () => {
      await http()
        .post(`${API}/admin/auth/login`)
        .send({ email: 'admin@example.com', password: 'wrong-password' })
        .expect(401);
      const user = await login(phone(28));
      await http().get(`${API}/admin/users`).set(authed(user)).expect(401);
      await http().get(`${API}/admin/users`).expect(401);
      const tokens = await http()
        .post(`${API}/admin/auth/login`)
        .send({ email: 'admin@example.com', password: 'e2e-admin-password' })
        .expect(200);
      await http()
        .get(`${API}/admin/users`)
        .set({ Authorization: `Bearer ${tokens.body.refreshToken}` })
        .expect(401);
      const refreshed = await http()
        .post(`${API}/admin/auth/refresh`)
        .send({ refreshToken: tokens.body.refreshToken })
        .expect(200);
      const me = await http()
        .get(`${API}/admin/auth/me`)
        .set({ Authorization: `Bearer ${refreshed.body.accessToken}` })
        .expect(200);
      expect(me.body.email).toBe('admin@example.com');
    });

    it('аналітика й список користувачів зі статистикою; блокування відрізає доступ', async () => {
      const overview = await as('get', '/analytics?days=14').expect(200);
      expect(overview.body.totals.users).toBeGreaterThan(0);
      expect(overview.body.series).toHaveLength(14);

      const user = await login(phone(29));
      const list = await as('get', `/users?search=${encodeURIComponent('500000029')}`).expect(200);
      expect(list.body.total).toBe(1);
      expect(list.body.items[0]).toMatchObject({ id: user.id, blockedAt: null });
      expect(list.body.items[0].stats).toMatchObject({ families: 0 });

      await as('patch', `/users/${user.id}`).send({ name: 'Оновлено з CRM' }).expect(200);
      await as('post', `/users/${user.id}/block`).send({ blocked: true }).expect(200);
      const blocked = await get(user, '/users/me').expect(403);
      expect(blocked.body.code ?? blocked.body.error?.code).toBe('ACCOUNT_BLOCKED');
      await http().post(`${API}/auth/refresh`).send({ refreshToken: user.refresh }).expect(401);

      await as('post', `/users/${user.id}/block`).send({ blocked: false }).expect(200);
      const detail = await as('get', `/users/${user.id}`).expect(200);
      expect(detail.body.user).toMatchObject({ name: 'Оновлено з CRM', blockedAt: null });

      await as('delete', `/users/${user.id}`).expect(204);
      await as('get', `/users/${user.id}`).expect(404);
    });

    it('вправа: створення з однією мовою (решта = українська), правка, видалення', async () => {
      const created = await as('post', '/exercises')
        .send({
          slug: 'crm-test-march',
          category: 'cardio',
          name: { uk: 'Марш на місці', en: 'March in place' },
          benefit: { uk: 'Розганяє кров' },
          targetSeconds: 30,
          recordMaxSec: 30,
          workoutTypes: ['cardio'],
          durationMin: 2,
          muscles: [{ uk: 'Ноги' }],
          sortOrder: 500,
          isActive: true,
        })
        .expect(201);
      expect(created.body.name).toEqual({
        uk: 'Марш на місці',
        ru: 'Марш на місці',
        pl: 'Марш на місці',
        en: 'March in place',
      });
      expect(created.body.managedByAdmin).toBe(true);

      await as('post', '/exercises')
        .send({ ...created.body, id: undefined, slug: 'crm-test-march' })
        .expect(400); // зайві поля (id, createdAt…) відкидає валідація
      await as('patch', `/exercises/${created.body.id}`).send({ targetSeconds: null }).expect(400); // без жодної цілі вправа неможлива
      const updated = await as('patch', `/exercises/${created.body.id}`)
        .send({ targetReps: 20, targetSeconds: null, aiCriteria: 'Knees go up alternately' })
        .expect(200);
      expect(updated.body).toMatchObject({ targetReps: 20, targetSeconds: null });

      const removed = await as('delete', `/exercises/${created.body.id}`).expect(200);
      expect(removed.body).toEqual({ deleted: true, deactivated: false });
    });

    it('пресет: створення, ліміт вправ, архів ховає з каталогу застосунку', async () => {
      const exercises = await as('get', '/exercises').expect(200);
      const ids: string[] = exercises.body.slice(0, 3).map((e: { id: string }) => e.id);
      const preset = await as('post', '/programs')
        .send({
          slug: 'crm-test-preset',
          name: { uk: 'Пресет з CRM' },
          highlights: [{ uk: 'Легко' }],
          durationType: 'week',
          exercises: ids.map((exerciseId) => ({ exerciseId, planDays: [1, 3, 5] })),
        })
        .expect(201);
      expect(preset.body.exercises).toHaveLength(3);

      const user = await register(30, 'child', 'CRM Дитина');
      const catalog = await get(user, '/programs/presets').expect(200);
      expect(catalog.body.map((p: { id: string }) => p.id)).toContain(preset.body.id);

      await as('put', '/app-config')
        .send({ limits: { maxProgramExercises: 2 } })
        .expect(200);
      await as('patch', `/programs/${preset.body.id}`)
        .send({ exercises: ids.map((exerciseId) => ({ exerciseId, planDays: [1] })) })
        .expect(422);
      // ліміт діє і для ручного добору дитиною
      await post(user, '/programs', {
        name: 'Моя',
        durationType: 'week',
        exercises: ids.map((exerciseId) => ({ exerciseId, planDays: [1] })),
      }).expect(422);
      await as('put', '/app-config')
        .send({ limits: { maxProgramExercises: 20 } })
        .expect(200);

      await as('post', `/programs/${preset.body.id}/archive`).send({ archived: true }).expect(200);
      const after = await get(user, '/programs/presets').expect(200);
      expect(after.body.map((p: { id: string }) => p.id)).not.toContain(preset.body.id);
      const removed = await as('delete', `/programs/${preset.body.id}`).expect(200);
      expect(removed.body.deleted).toBe(true);
    });

    it('різновиди вправ: на місці вправи з групою день у день чергуються вправи групи', async () => {
      const base = {
        category: 'strength',
        benefit: { uk: 'Користь' },
        targetReps: 10,
        recordMaxSec: 30,
        workoutTypes: ['strength'],
        durationMin: 2,
        muscles: [],
        isActive: true,
        variantGroup: 'e2e-rotation',
        voicePattern: 'squat',
      };
      const ids: string[] = [];
      for (const [i, slug] of ['e2e-rot-a', 'e2e-rot-b', 'e2e-rot-c'].entries()) {
        const created = await as('post', '/exercises')
          .send({ ...base, slug, name: { uk: slug }, sortOrder: 900 + i })
          .expect(201);
        expect(created.body).toMatchObject({ variantGroup: 'e2e-rotation', voicePattern: 'squat' });
        ids.push(created.body.id as string);
      }
      const { child, familyId } = await makeFamily(31, 32, ['Ротація', 'Мама ротації']);
      const program = await post(child, '/programs', {
        name: 'Ротація',
        durationType: 'week',
        exercises: [{ exerciseId: ids[0], planDays: [1, 2, 3, 4, 5, 6, 7] }],
      }).expect(201);
      expect(program.body.exercises[0]).toMatchObject({
        benefit: 'Користь',
        variantGroup: 'e2e-rotation',
      });
      await post(child, `/programs/${program.body.id}/assign`).expect(200);

      const day = (offset: number) => DateTime.now().plus({ days: offset }).toISODate();
      const slugs: string[] = [];
      for (const offset of [2, 3, 4]) {
        const plan = await http()
          .get(`${API}/workouts/plan/${day(offset)}`)
          .set({ ...authed(child), 'X-Family-Id': familyId })
          .expect(200);
        expect(plan.body.exercises).toHaveLength(1);
        expect(plan.body.exercises[0].info).toMatchObject({
          benefit: 'Користь',
          voicePattern: 'squat',
        });
        slugs.push(plan.body.exercises[0].slug as string);
      }
      // три дні поспіль — три різні різновиди групи
      expect(new Set(slugs).size).toBe(3);
      expect(slugs.every((slug) => slug.startsWith('e2e-rot-'))).toBe(true);

      // вимкнений різновид у чергування не потрапляє
      await as('patch', `/exercises/${ids[1]}`).send({ isActive: false }).expect(200);
      for (const offset of [5, 6, 7, 8]) {
        const plan = await http()
          .get(`${API}/workouts/plan/${day(offset)}`)
          .set({ ...authed(child), 'X-Family-Id': familyId })
          .expect(200);
        expect(plan.body.exercises[0].slug).not.toBe('e2e-rot-b');
      }
    });

    it('статистика сімʼї: фонд і зароблене за поточний місяць', async () => {
      const { child, parent } = await makeFamily(33, 34, ['Фонд', 'Мама фонду']);
      await get(parent, '/workouts/today').expect(200);
      const stats = await get(child, '/families/current/stats').expect(200);
      const today = DateTime.now();
      const daysLeft = today.daysInMonth - today.day + 1;
      // план — усі дні тижня, ставка €5: фонд = сьогодні + решта днів місяця
      expect(stats.body).toMatchObject({
        monthPlannedDays: daysLeft,
        monthFund: daysLeft * 5,
        monthEarned: 0,
        monthCompletedDays: 0,
      });
      const parentStats = await get(parent, '/families/current/stats').expect(200);
      expect(parentStats.body.monthFund).toBe(stats.body.monthFund);
    });

    it('налаштування застосунку: палітра й тексти публічно доступні клієнту, некоректний колір відхиляється', async () => {
      await as('put', '/app-config')
        .send({ theme: { presetId: 'x', colors: { forest: 'red' } } })
        .expect(400);
      await as('put', '/app-config')
        .send({
          theme: { presetId: 'ocean', colors: { forest: '#0b3d5c', unknownToken: '#000000' } },
          content: { uk: { 'onboarding.slide1.title': 'Привіт!', 'onboarding.slide2.title': ' ' } },
        })
        .expect(200);
      const pub = await http().get(`${API}/app-config`).expect(200);
      expect(pub.body.theme).toEqual({ presetId: 'ocean', colors: { forest: '#0B3D5C' } });
      expect(pub.body.content).toEqual({ uk: { 'onboarding.slide1.title': 'Привіт!' } });
      expect(pub.body.limits).toMatchObject({ maxProgramExercises: 20, maxExercisesPerDay: 12 });
      expect(pub.body.version).not.toBe('default');
      await as('put', '/app-config').send({ theme: null, content: {} }).expect(200);
    });
  });

  describe('правки: довільний порядок, пропуск вправи, фонд, підбір ШІ, вхід Google', () => {
    it('вправи в будь-якому порядку; невдалу можна пропустити без оплати, день завершується', async () => {
      const { child, parent } = await makeFamily(35, 36, ['Порядок', 'Мама порядку']);
      const today = await get(parent, '/workouts/today').expect(200);
      const sid = today.body.session.id as string;
      const ids = today.body.exercises.map((e: { exerciseId: string }) => e.exerciseId) as string[];
      expect(ids).toHaveLength(4);

      // спершу остання вправа — порядок не важливий
      const last = await post(parent, `/workouts/${sid}/exercises/${ids[3]}/complete`, {
        photoKeys: await uploadPhotos(parent, sid, ids[3], 24),
      }).expect(200);
      expect(last.body).toMatchObject({ accepted: true, dayCompleted: false });

      // перша не вдалася → пропуск: запис є, оплати немає; повтор ідемпотентний
      const skipped = await post(parent, `/workouts/${sid}/exercises/${ids[0]}/skip`).expect(200);
      expect(skipped.body).toMatchObject({ accepted: true, earned: 0, dayCompleted: false });
      expect(skipped.body.record).toMatchObject({ skipped: true, photoCount: 0 });
      await post(parent, `/workouts/${sid}/exercises/${ids[0]}/skip`).expect(200);
      await post(child, `/workouts/${sid}/exercises/${ids[1]}/skip`).expect(403);

      const mid = await get(parent, '/workouts/today').expect(200);
      expect(mid.body.exercises.map((e: { state: string }) => e.state)).toEqual([
        'skipped',
        'current',
        'current',
        'done',
      ]);
      expect(mid.body.session.exercisesDone).toBe(2);

      for (const id of [ids[2], ids[1]]) {
        await post(parent, `/workouts/${sid}/exercises/${id}/complete`, {
          photoKeys: await uploadPhotos(parent, sid, id, 24),
        }).expect(200);
      }
      const done = await get(parent, '/workouts/today').expect(200);
      expect(done.body.session).toMatchObject({ status: 'completed', exercisesDone: 4 });
      // ставка €5 на 4 вправи по €1.25: пропущена не оплачується
      expect(done.body.session.earned).toBe(3.75);
      expect(done.body.exercises.map((e: { state: string }) => e.state)).toEqual([
        'skipped',
        'done',
        'done',
        'done',
      ]);
    });

    it('фонд: поповнює лише спонсор; залишок і на скільки вистачить — у статистиці', async () => {
      const { child, parent } = await makeFamily(37, 38, ['Фонд2', 'Мама фонду2']);
      await post(parent, '/ledger/fund-deposits', { amount: 100 }).expect(403);
      await post(child, '/ledger/fund-deposits', { amount: 0 }).expect(400);
      await post(child, '/ledger/fund-deposits', { amount: 1_000_000 }).expect(400);
      const dep = await post(child, '/ledger/fund-deposits', { amount: 300 }).expect(201);
      expect(dep.body).toMatchObject({ amount: 300, currency: 'EUR' });
      const stats = await get(parent, '/families/current/stats').expect(200);
      // ставка €5 × 7 днів × 4.33 = €151.55 на місяць → €300 вистачить на ~1.9 міс.
      expect(stats.body).toMatchObject({
        fundDeposited: 300,
        fundBalance: 300,
        fundMonthlyCost: 151.55,
        fundMonths: 1.9,
      });
      expect(stats.body.fundCoversUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('підбір ШІ за замовчуванням і відмічені спонсором вправи', async () => {
      const { child, familyId } = await makeFamily(39, 40, ['ШІ', 'Мама ШІ']);
      const day = DateTime.now().plus({ days: 3 }).toISODate();
      const planOf = async () =>
        (
          await http()
            .get(`${API}/workouts/plan/${day}`)
            .set({ ...authed(child), 'X-Family-Id': familyId })
            .expect(200)
        ).body as { exercises: { exerciseId: string; targetSteps: number | null }[] };

      const ai = await patch(child, '/families/current/plan', { exerciseMode: 'ai' }).expect(200);
      expect(ai.body).toMatchObject({ exerciseMode: 'ai', selectedExerciseIds: [] });
      const aiDay = await planOf();
      expect(aiDay.exercises.length).toBeGreaterThan(0);
      expect(aiDay.exercises.every((e) => e.targetSteps === null)).toBe(true);

      const catalog = await get(child, '/exercises').expect(200);
      const picked = (catalog.body as { id: string; targetSteps: number | null }[])
        .filter((e) => e.targetSteps === null)
        .slice(0, 2)
        .map((e) => e.id);
      await patch(child, '/families/current/plan', {
        exerciseMode: 'manual',
        selectedExerciseIds: [randomUUID()],
      }).expect(404);
      const manual = await patch(child, '/families/current/plan', {
        exerciseMode: 'manual',
        selectedExerciseIds: picked,
      }).expect(200);
      expect(manual.body).toMatchObject({ exerciseMode: 'manual', selectedExerciseIds: picked });
      const manualDay = await planOf();
      expect(manualDay.exercises.length).toBeGreaterThan(0);
      expect(manualDay.exercises.every((e) => picked.includes(e.exerciseId))).toBe(true);

      // темп автоускладнення — до 100 %
      await patch(child, '/families/current/plan', { progressionPct: 100 }).expect(200);
      await patch(child, '/families/current/plan', { progressionPct: 101 }).expect(400);
    });

    it('безкоштовна перевірка: нерухомі кадри відхиляються без AI; після 5 спроб — ліміт', async () => {
      const { parent } = await makeFamily(43, 44, ['Ліміт', 'Мама ліміту']);
      const today = await get(parent, '/workouts/today').expect(200);
      const sid = today.body.session.id as string;
      const ex = today.body.exercises[0].exerciseId as string;
      for (let i = 0; i < 5; i += 1) {
        const still = await post(parent, `/workouts/${sid}/exercises/${ex}/complete`, {
          photoKeys: await uploadPhotos(parent, sid, ex, 24, true),
        }).expect(200);
        expect(still.body).toMatchObject({ accepted: false, attempt: { score: 0 } });
        expect(still.body.attempt.feedback).toContain('Рух не видно');
      }
      const limited = await post(parent, `/workouts/${sid}/exercises/${ex}/complete`, {
        photoKeys: await uploadPhotos(parent, sid, ex, 24),
      }).expect(429);
      expect(limited.body.code).toBe('AI_ATTEMPTS_LIMIT');
      // пропустити вправу після ліміту можна
      await post(parent, `/workouts/${sid}/exercises/${ex}/skip`).expect(200);
    });

    it('гроші через Stripe: поповнення (вебхук), виплата через Connect, автопоповнення, повернення', async () => {
      const SECRET = 'whsec_e2e_test_secret';
      const hook = (type: string, object: object) => {
        const { payload, header } = signedEvent(type, object, SECRET);
        return http()
          .post(`${API}/payments/webhooks/stripe`)
          .set('Stripe-Signature', header)
          .set('Content-Type', 'application/json')
          .send(payload);
      };
      const { child, parent } = await makeFamily(45, 46, ['Гроші', 'Мама грошей']);
      const cfg = await get(child, '/payments/config').expect(200);
      expect(cfg.body).toMatchObject({ enabled: true, publishableKey: 'pk_test_e2e' });

      // 1) поповнення фонду: PaymentIntent → pending; зараховує лише підписаний вебхук
      await post(parent, '/payments/fund/intent', { amount: 50 }).expect(403);
      await post(child, '/payments/fund/intent', { amount: 1 }).expect(400);
      const intent = await post(child, '/payments/fund/intent', { amount: 50 }).expect(201);
      expect(intent.body).toMatchObject({
        clientSecret: 'pi_secret',
        ephemeralKey: 'ek_test_secret',
        amount: 50,
        currency: 'EUR',
      });
      const piId = intent.body.paymentIntentId as string;
      const created = stripe.paymentIntents.create.mock.calls.at(-1)?.[0] as {
        amount: number;
        automatic_payment_methods: unknown;
      };
      expect(created).toMatchObject({ amount: 5000, automatic_payment_methods: { enabled: true } });
      let stats = await get(child, '/families/current/stats').expect(200);
      expect(stats.body.fundBalance).toBe(0);

      const bad = signedEvent('payment_intent.succeeded', {}, 'whsec_wrong');
      await http()
        .post(`${API}/payments/webhooks/stripe`)
        .set('Stripe-Signature', bad.header)
        .set('Content-Type', 'application/json')
        .send(bad.payload)
        .expect(400);
      const pi = {
        id: piId,
        object: 'payment_intent',
        amount: 5000,
        amount_received: 5000,
        currency: 'eur',
        status: 'succeeded',
        payment_method: 'pm_blik',
        payment_method_types: ['blik'],
        metadata: { kind: 'fund_topup' },
      };
      stripe.paymentMethods.retrieve.mockResolvedValueOnce({
        id: 'pm_blik',
        type: 'blik',
        card: null,
      } as never);
      await hook('payment_intent.succeeded', pi).expect(200);
      await hook('payment_intent.succeeded', pi).expect(200); // повтор — без змін
      stats = await get(child, '/families/current/stats').expect(200);
      expect(stats.body).toMatchObject({ fundBalance: 50, fundDeposited: 50 });
      const status = await get(child, `/payments/fund/intent/${piId}`).expect(200);
      expect(status.body).toEqual({ status: 'succeeded', amount: 50 });

      // 2) виплата: спершу налаштування Connect; без нього — PAYOUTS_NOT_READY
      let payout = await get(parent, '/payments/payouts/status').expect(200);
      expect(payout.body).toMatchObject({
        connected: false,
        payoutsEnabled: false,
        heldFunds: 50,
        available: 0,
      });
      const link = await post(parent, '/payments/payouts/onboarding', {}).expect(200);
      expect(link.body.url).toContain('connect.stripe.com');
      const acctId = ((await stripe.accounts.create.mock.results.at(-1)?.value) as { id: string })
        .id;
      const notReady = await post(parent, '/payments/payouts/withdraw', { amount: 1 }).expect(409);
      expect(notReady.body.code).toBe('PAYOUTS_NOT_READY');
      await hook('account.updated', {
        id: acctId,
        object: 'account',
        payouts_enabled: true,
        details_submitted: true,
      }).expect(200);
      const ret = await http().get(`${API}/payments/payouts/return?state=done`).expect(302);
      expect(ret.headers.location).toBe('healthyflexy://payouts?state=done');

      // мама заробляє за вправу (€1.25), виводить — не більше заробленого
      const today = await get(parent, '/workouts/today').expect(200);
      const sid = today.body.session.id as string;
      const ex = today.body.exercises[0].exerciseId as string;
      await post(parent, `/workouts/${sid}/exercises/${ex}/complete`, {
        photoKeys: await uploadPhotos(parent, sid, ex, 24),
      }).expect(200);
      payout = await get(parent, '/payments/payouts/status').expect(200);
      expect(payout.body).toMatchObject({ payoutsEnabled: true, available: 1.25 });
      const tooMuch = await post(parent, '/payments/payouts/withdraw', { amount: 5 }).expect(422);
      expect(tooMuch.body.code).toBe('PAYOUT_EXCEEDS_AVAILABLE');

      // відмова Stripe → переказ відхилено, сума знову доступна
      stripe.transfers.create.mockRejectedValueOnce(new Error('insufficient platform balance'));
      const failed = await post(parent, '/payments/payouts/withdraw', { amount: 1.25 }).expect(502);
      expect(failed.body.code).toBe('PAYMENT_FAILED');
      const ok = await post(parent, '/payments/payouts/withdraw', { amount: 1.25 }).expect(200);
      expect(ok.body).toMatchObject({ amount: 1.25, status: 'confirmed', currency: 'EUR' });
      const tr = stripe.transfers.create.mock.calls.at(-1) as unknown as [
        { amount: number; destination: string },
        { idempotencyKey: string },
      ];
      expect(tr[0]).toMatchObject({ amount: 125, destination: acctId });
      expect(tr[1].idempotencyKey).toMatch(/^payout:/);
      stats = await get(child, '/families/current/stats').expect(200);
      expect(stats.body).toMatchObject({ owed: 0, settledTotal: 1.25 });
      payout = await get(parent, '/payments/payouts/status').expect(200);
      expect(payout.body).toMatchObject({ heldFunds: 48.75, available: 0 });

      // 3) автопоповнення: без картки — помилка; картка зберігається вебхуком setup_intent.succeeded
      const noCard = await put(child, '/payments/auto-topup', {
        amount: 20,
        interval: 'week',
        active: true,
      }).expect(422);
      expect(noCard.body.code).toBe('PAYMENT_METHOD_REQUIRED');
      const setup = await post(child, '/payments/auto-topup/setup-intent').expect(201);
      expect(setup.body.clientSecret).toBe('seti_secret');
      const cus = ((await stripe.customers.create.mock.results.at(-1)?.value) as { id: string }).id;
      await hook('setup_intent.succeeded', {
        id: 'seti_x',
        object: 'setup_intent',
        customer: cus,
        payment_method: 'pm_card',
      }).expect(200);
      const auto = await put(child, '/payments/auto-topup', {
        amount: 20,
        interval: 'week',
        active: true,
      }).expect(200);
      expect(auto.body).toMatchObject({
        active: true,
        amount: 20,
        interval: 'week',
        card: { brand: 'visa', last4: '4242' },
      });
      const run = await app.get(PaymentsService).runDueAutoTopups(new Date(Date.now() + 1000));
      expect(run).toEqual({ charged: 1, failed: 0 });
      const offSession = stripe.paymentIntents.create.mock.calls.at(-1)?.[0] as {
        off_session: boolean;
        confirm: boolean;
        amount: number;
      };
      expect(offSession).toMatchObject({ off_session: true, confirm: true, amount: 2000 });
      stats = await get(child, '/families/current/stats').expect(200);
      expect(stats.body.fundDeposited).toBe(70);
      const after = await get(child, '/payments/auto-topup').expect(200);
      expect(new Date(after.body.nextRunAt).getTime()).toBeGreaterThan(Date.now() + 6 * 86_400_000);

      // 4) повне повернення першої оплати → гроші йдуть із фонду
      await hook('charge.refunded', {
        id: 'ch_1',
        object: 'charge',
        payment_intent: piId,
        refunded: true,
        amount_refunded: 5000,
      }).expect(200);
      stats = await get(child, '/families/current/stats').expect(200);
      expect(stats.body.fundDeposited).toBe(20);
    });

    it('підписка App Store / Google Play: без налаштувань — вимкнено; RTDN лише з секретом', async () => {
      const { child } = await makeFamily(47, 48, ['Підписка', 'Мама підписки']);
      const me = await get(child, '/subscriptions/me').expect(200);
      expect(me.body).toMatchObject({ active: false, platform: null });
      const apple = await post(child, '/subscriptions/apple', {
        signedTransaction: 'x'.repeat(40),
      }).expect(503);
      expect(apple.body.code).toBe('IAP_DISABLED');
      const google = await post(child, '/subscriptions/google', {
        productId: 'premium',
        purchaseToken: 'y'.repeat(40),
      }).expect(503);
      expect(google.body.code).toBe('IAP_DISABLED');
      await http()
        .post(`${API}/subscriptions/google/rtdn`)
        .send({ message: { data: 'e30=' } })
        .expect(401);
    });

    it('вхід Google без налаштованих Client ID вимкнено', async () => {
      const res = await http()
        .post(`${API}/auth/google`)
        .send({ idToken: 'x'.repeat(40) })
        .expect(503);
      expect(res.body.code).toBe('GOOGLE_AUTH_DISABLED');
    });
  });
});
