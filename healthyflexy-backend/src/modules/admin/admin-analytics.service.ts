import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

const num = (v: unknown) => Number(v ?? 0);

/** Аналітика для дашборду CRM: підсумки, динаміка по днях, популярність вправ, якість AI-перевірки */
@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async overview(days: number) {
    const [totals] = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT
         (SELECT count(*) FROM users) AS users,
         (SELECT count(*) FROM users WHERE role = 'parent') AS parents,
         (SELECT count(*) FROM users WHERE role = 'child') AS children,
         (SELECT count(*) FROM users WHERE role IS NULL) AS "noRole",
         (SELECT count(*) FROM users WHERE blocked_at IS NOT NULL) AS blocked,
         (SELECT count(*) FROM users WHERE created_at >= now() - make_interval(days => $1::int)) AS "newUsers",
         (SELECT count(*) FROM users WHERE last_login_at >= now() - interval '7 days') AS "activeWeek",
         (SELECT count(*) FROM families) AS families,
         (SELECT count(DISTINCT family_id) FROM day_sessions
           WHERE date >= current_date - 6 AND exercises_done > 0) AS "activeFamiliesWeek",
         (SELECT count(*) FROM day_sessions WHERE status = 'completed') AS "completedDays",
         (SELECT count(*) FROM day_sessions WHERE date >= current_date - ($1::int - 1)) AS "periodDays",
         (SELECT count(*) FROM day_sessions
           WHERE date >= current_date - ($1::int - 1) AND status = 'completed') AS "periodCompleted",
         (SELECT coalesce(sum(exercises_done), 0) FROM day_sessions) AS "exercisesDone",
         (SELECT coalesce(sum(earned), 0) FROM day_sessions) AS earned,
         (SELECT coalesce(sum(amount), 0) FROM ledger_entries
           WHERE type = 'settlement' AND status = 'confirmed') AS settled,
         (SELECT count(*) FROM exercise_attempt_logs) AS "aiAttempts",
         (SELECT count(*) FROM exercise_attempt_logs WHERE is_correct) AS "aiAccepted",
         (SELECT coalesce(avg(score), 0) FROM exercise_attempt_logs) AS "aiAvgScore",
         (SELECT count(*) FROM exercises WHERE is_active) AS "activeExercises",
         (SELECT count(*) FROM programs WHERE is_preset AND archived_at IS NULL) AS presets,
         (SELECT count(*) FROM programs WHERE NOT is_preset) AS "customPrograms"`,
      [days],
    );

    const series = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
              (SELECT count(*) FROM users u WHERE u.created_at::date = d::date) AS signups,
              (SELECT count(*) FROM day_sessions s WHERE s.date = d::date AND s.status = 'completed') AS completed,
              (SELECT count(*) FROM day_sessions s WHERE s.date = d::date AND s.status = 'missed') AS missed,
              (SELECT coalesce(sum(s.exercises_done), 0) FROM day_sessions s WHERE s.date = d::date) AS exercises,
              (SELECT coalesce(sum(s.earned), 0) FROM day_sessions s WHERE s.date = d::date) AS earned,
              (SELECT count(*) FROM exercise_attempt_logs l WHERE l.analyzed_at::date = d::date) AS "aiAttempts",
              (SELECT count(*) FROM exercise_attempt_logs l
                WHERE l.analyzed_at::date = d::date AND l.is_correct) AS "aiAccepted"
         FROM generate_series(current_date - ($1::int - 1), current_date, interval '1 day') d
        ORDER BY d`,
      [days],
    );

    const topExercises = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT e.id, e.slug, e.name, e.category,
              count(r.id) AS done,
              (SELECT count(*) FROM exercise_attempt_logs l WHERE l.exercise_id = e.id) AS attempts,
              (SELECT count(*) FROM exercise_attempt_logs l WHERE l.exercise_id = e.id AND l.is_correct) AS accepted
         FROM exercises e
         LEFT JOIN exercise_records r ON r.exercise_id = e.id
        GROUP BY e.id
        ORDER BY done DESC, e.sort_order
        LIMIT 12`,
    );

    const programs = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT p.id, p.name, p.is_preset AS "isPreset", count(a.id) AS families
         FROM programs p JOIN user_program_assignments a ON a.program_id = p.id AND a.is_active
        GROUP BY p.id ORDER BY families DESC LIMIT 8`,
    );

    const languages = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT language, count(*) AS users FROM users GROUP BY language ORDER BY users DESC`,
    );

    // по днях тижня: коли займаються (для підказок про нагадування)
    const weekdays = await this.dataSource.query<Record<string, unknown>[]>(
      `SELECT extract(isodow FROM completed_at)::int AS weekday, count(*) AS done
         FROM exercise_records GROUP BY 1 ORDER BY 1`,
    );

    const t = totals;
    const attempts = num(t.aiAttempts);
    const periodDays = num(t.periodDays);
    return {
      totals: {
        users: num(t.users),
        parents: num(t.parents),
        children: num(t.children),
        noRole: num(t.noRole),
        blocked: num(t.blocked),
        newUsers: num(t.newUsers),
        activeWeek: num(t.activeWeek),
        families: num(t.families),
        activeFamiliesWeek: num(t.activeFamiliesWeek),
        completedDays: num(t.completedDays),
        completionRate: periodDays ? Math.round((num(t.periodCompleted) / periodDays) * 100) : 0,
        exercisesDone: num(t.exercisesDone),
        earned: num(t.earned),
        settled: num(t.settled),
        aiAttempts: attempts,
        aiAcceptRate: attempts ? Math.round((num(t.aiAccepted) / attempts) * 100) : 0,
        aiAvgScore: Math.round(num(t.aiAvgScore)),
        activeExercises: num(t.activeExercises),
        presets: num(t.presets),
        customPrograms: num(t.customPrograms),
      },
      series: series.map((s) => ({
        date: s.date as string,
        signups: num(s.signups),
        completed: num(s.completed),
        missed: num(s.missed),
        exercises: num(s.exercises),
        earned: num(s.earned),
        aiAttempts: num(s.aiAttempts),
        aiAccepted: num(s.aiAccepted),
      })),
      topExercises: topExercises.map((e) => ({
        id: e.id as string,
        slug: e.slug as string,
        name: (e.name as Record<string, string>).ru || (e.name as Record<string, string>).uk,
        category: e.category as string,
        done: num(e.done),
        attempts: num(e.attempts),
        accepted: num(e.accepted),
      })),
      programs: programs.map((p) => ({
        id: p.id as string,
        name: (p.name as Record<string, string>).ru || (p.name as Record<string, string>).uk,
        isPreset: p.isPreset as boolean,
        families: num(p.families),
      })),
      languages: languages.map((l) => ({ language: l.language as string, users: num(l.users) })),
      weekdays: weekdays.map((w) => ({ weekday: num(w.weekday), done: num(w.done) })),
    };
  }
}
