import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants';
import { AppLanguage } from '../../common/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { AccountDeletionService } from '../users/account-deletion.service';
import { User } from '../users/entities/user.entity';
import { AdminUpdateUserDto, UsersQueryDto } from './dto/admin.dto';

export interface AdminUserStats {
  families: number;
  completedDays: number;
  missedDays: number;
  exercisesDone: number;
  earned: number;
  aiAttempts: number;
  aiAccepted: number;
  lastActivityAt: string | null;
}

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  language: AppLanguage;
  createdAt: string;
  lastLoginAt: string | null;
  blockedAt: string | null;
  stats: AdminUserStats;
}

const EMPTY_STATS: AdminUserStats = {
  families: 0,
  completedDays: 0,
  missedDays: 0,
  exercisesDone: 0,
  earned: 0,
  aiAttempts: 0,
  aiAccepted: 0,
  lastActivityAt: null,
};

const toIso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);

/** Керування користувачами в CRM: список зі статистикою, картка, правка, блокування, видалення */
@Injectable()
export class AdminUsersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly deletion: AccountDeletionService,
  ) {}

  async list(query: UsersQueryDto): Promise<{ items: AdminUserRow[]; total: number }> {
    const qb = this.users.createQueryBuilder('u');
    if (query.search?.trim()) {
      const term = `%${query.search.trim().replace(/[%_\\]/g, '\\$&')}%`;
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('u.name ILIKE :term', { term })
            .orWhere('u.email ILIKE :term', { term })
            .orWhere('u.phone ILIKE :term', { term }),
        ),
      );
    }
    if (query.role === 'none') qb.andWhere('u.role IS NULL');
    else if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status === 'blocked') qb.andWhere('u.blocked_at IS NOT NULL');
    if (query.status === 'active') qb.andWhere('u.blocked_at IS NULL');

    const sort = query.sort ?? 'createdAt';
    qb.orderBy(`u.${sort}`, sort === 'name' ? 'ASC' : 'DESC', 'NULLS LAST')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();
    const stats = await this.statsFor(rows.map((u) => u.id));
    return { items: rows.map((u) => this.toRow(u, stats.get(u.id) ?? EMPTY_STATS)), total };
  }

  async detail(id: string) {
    const user = await this.findOrFail(id);
    const stats = (await this.statsFor([id])).get(id) ?? EMPTY_STATS;

    const families = await this.dataSource.query<
      {
        id: string;
        rate: string;
        currency: string;
        planDays: number[];
        workoutMinutes: number;
        createdAt: Date;
        childId: string;
        childName: string | null;
        parentId: string;
        parentName: string | null;
        parentLabel: string | null;
        programName: Record<string, string> | null;
      }[]
    >(
      `SELECT f.id, f.rate, f.currency, f.plan_days AS "planDays", f.workout_minutes AS "workoutMinutes",
              f.created_at AS "createdAt", f.child_id AS "childId", c.name AS "childName",
              f.parent_id AS "parentId", p.name AS "parentName", f.parent_label AS "parentLabel",
              pr.name AS "programName"
         FROM families f
         JOIN users c ON c.id = f.child_id
         JOIN users p ON p.id = f.parent_id
         LEFT JOIN user_program_assignments a ON a.family_id = f.id AND a.is_active
         LEFT JOIN programs pr ON pr.id = a.program_id
        WHERE f.parent_id = $1 OR f.child_id = $1
        ORDER BY f.created_at`,
      [id],
    );
    const familyIds = families.map((f) => f.id);

    const sessions = familyIds.length
      ? await this.dataSource.query<
          {
            id: string;
            familyId: string;
            date: string;
            status: string;
            exercisesDone: number;
            exercisesTotal: number;
            earned: string;
          }[]
        >(
          `SELECT id, family_id AS "familyId", to_char(date, 'YYYY-MM-DD') AS date, status,
                  exercises_done AS "exercisesDone", exercises_total AS "exercisesTotal", earned
             FROM day_sessions WHERE family_id = ANY($1) ORDER BY date DESC LIMIT 60`,
          [familyIds],
        )
      : [];

    const attempts = familyIds.length
      ? await this.dataSource.query<
          {
            id: string;
            analyzedAt: Date;
            isCorrect: boolean;
            score: number;
            feedback: string;
            issues: unknown;
            exerciseName: Record<string, string>;
          }[]
        >(
          `SELECT l.id, l.analyzed_at AS "analyzedAt", l.is_correct AS "isCorrect", l.score, l.feedback,
                  l.issues, e.name AS "exerciseName"
             FROM exercise_attempt_logs l
             JOIN day_sessions s ON s.id = l.session_id
             JOIN exercises e ON e.id = l.exercise_id
            WHERE s.family_id = ANY($1)
            ORDER BY l.analyzed_at DESC LIMIT 30`,
          [familyIds],
        )
      : [];

    const ledger = familyIds.length
      ? await this.dataSource.query<
          {
            id: string;
            type: string;
            status: string;
            amount: string;
            currency: string;
            createdAt: Date;
          }[]
        >(
          `SELECT id, type, status, amount, currency, created_at AS "createdAt"
             FROM ledger_entries WHERE family_id = ANY($1) ORDER BY created_at DESC LIMIT 30`,
          [familyIds],
        )
      : [];

    // активність за 30 днів: виконані вправи по днях
    const activity = familyIds.length
      ? await this.dataSource.query<{ date: string; done: number; earned: string }[]>(
          `SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
                  coalesce(sum(s.exercises_done), 0)::int AS done,
                  coalesce(sum(s.earned), 0) AS earned
             FROM generate_series(current_date - 29, current_date, interval '1 day') d
             LEFT JOIN day_sessions s ON s.date = d::date AND s.family_id = ANY($1)
            GROUP BY d ORDER BY d`,
          [familyIds],
        )
      : [];

    return {
      user: {
        ...this.toRow(user, stats),
        age: user.age,
        timezone: user.timezone,
        pushEnabled: user.pushEnabled,
        gdprConsentAt: toIso(user.gdprConsentAt),
      },
      families: families.map((f) => ({
        ...f,
        rate: Number(f.rate),
        createdAt: toIso(f.createdAt),
        programName: f.programName ? f.programName.ru || f.programName.uk : null,
      })),
      sessions: sessions.map((s) => ({ ...s, earned: Number(s.earned) })),
      attempts: attempts.map((a) => ({
        ...a,
        analyzedAt: toIso(a.analyzedAt),
        exerciseName: a.exerciseName ? a.exerciseName.ru || a.exerciseName.uk : '',
      })),
      ledger: ledger.map((l) => ({
        ...l,
        amount: Number(l.amount),
        createdAt: toIso(l.createdAt),
      })),
      activity: activity.map((a) => ({ ...a, earned: Number(a.earned) })),
    };
  }

  async update(id: string, dto: AdminUpdateUserDto) {
    const user = await this.findOrFail(id);
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.age !== undefined) user.age = dto.age;
    if (dto.language !== undefined) user.language = dto.language;
    await this.users.save(user);
    return this.detail(id);
  }

  /** Блокування: усі запити користувача → 403, refresh-токени відкликаються */
  async setBlocked(id: string, blocked: boolean) {
    const user = await this.findOrFail(id);
    user.blockedAt = blocked ? (user.blockedAt ?? new Date()) : null;
    await this.users.save(user);
    if (blocked) {
      await this.dataSource.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [id]);
    }
    return this.detail(id);
  }

  async remove(id: string): Promise<void> {
    await this.findOrFail(id);
    await this.deletion.deleteAccount(id);
  }

  private async findOrFail(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, 'User not found');
    return user;
  }

  /** Статистика по сім'ях, де користувач — батько/мати або дитина */
  private async statsFor(ids: string[]): Promise<Map<string, AdminUserStats>> {
    if (ids.length === 0) return new Map();
    const rows = await this.dataSource.query<
      {
        id: string;
        families: number;
        completedDays: number;
        missedDays: number;
        exercisesDone: number;
        earned: string;
        aiAttempts: number;
        aiAccepted: number;
        lastActivityAt: Date | null;
      }[]
    >(
      `WITH fam AS (
         SELECT u.id AS user_id, f.id AS family_id
           FROM users u JOIN families f ON f.parent_id = u.id OR f.child_id = u.id
          WHERE u.id = ANY($1)
       ),
       ses AS (
         SELECT fam.user_id,
                count(*) FILTER (WHERE s.status = 'completed')::int AS completed,
                count(*) FILTER (WHERE s.status = 'missed')::int AS missed,
                coalesce(sum(s.exercises_done), 0)::int AS done,
                coalesce(sum(s.earned), 0) AS earned,
                max(s.updated_at) AS last_at
           FROM fam JOIN day_sessions s ON s.family_id = fam.family_id
          GROUP BY fam.user_id
       ),
       ai AS (
         SELECT fam.user_id, count(*)::int AS total, count(*) FILTER (WHERE l.is_correct)::int AS ok
           FROM fam
           JOIN day_sessions s ON s.family_id = fam.family_id
           JOIN exercise_attempt_logs l ON l.session_id = s.id
          GROUP BY fam.user_id
       )
       SELECT u.id,
              (SELECT count(*) FROM fam WHERE fam.user_id = u.id)::int AS families,
              coalesce(ses.completed, 0) AS "completedDays",
              coalesce(ses.missed, 0) AS "missedDays",
              coalesce(ses.done, 0) AS "exercisesDone",
              coalesce(ses.earned, 0) AS earned,
              coalesce(ai.total, 0) AS "aiAttempts",
              coalesce(ai.ok, 0) AS "aiAccepted",
              ses.last_at AS "lastActivityAt"
         FROM users u
         LEFT JOIN ses ON ses.user_id = u.id
         LEFT JOIN ai ON ai.user_id = u.id
        WHERE u.id = ANY($1)`,
      [ids],
    );
    return new Map(
      rows.map((r) => [
        r.id,
        { ...r, earned: Number(r.earned), lastActivityAt: toIso(r.lastActivityAt) },
      ]),
    );
  }

  private toRow(u: User, stats: AdminUserStats): AdminUserRow {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      language: u.language,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: toIso(u.lastLoginAt),
      blockedAt: toIso(u.blockedAt),
      stats,
    };
  }
}
