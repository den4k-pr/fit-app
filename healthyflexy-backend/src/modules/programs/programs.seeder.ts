import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EnvironmentVariables, NodeEnv } from '../../config';
import { FITNESS_PROGRAMS_SEED, PROGRAMS_SEED } from '../../database/seeds/programs.seed-data';

const ALL_PRESETS = [...FITNESS_PROGRAMS_SEED, ...PROGRAMS_SEED];
import { Exercise } from '../exercises/entities/exercise.entity';
import { ProgramExercise } from './entities/program-exercise.entity';
import { Program } from './entities/program.entity';
import { UserProgramAssignment } from './entities/user-program-assignment.entity';

/** Пресет, автоматично призначений сім'ям без активної програми (першопрохідний бекфіл + нові сім'ї) */
const DEFAULT_PRESET_SLUG = 'energy-start-1-week';

/**
 * При старті (після міграцій): UPSERT пресет-програм за slug (крім змінених у CRM — `managedByAdmin`;
 * у застосунку пресети не редагуються — тому, коли зміниться seed-файл
 * (переклади, highlights, склад вправ), уже наявний рядок безпечно перезаписується цими даними),
 * і призначає дефолтний пресет сім'ям, у яких ще немає активної програми (інакше «Сьогодні»
 * лишилося б порожнім для наявних сімей після переходу на програмне джерело вправ).
 */
@Injectable()
export class ProgramsSeeder implements OnModuleInit {
  private readonly logger = new Logger(ProgramsSeeder.name);

  constructor(
    @InjectRepository(Program) private readonly programs: Repository<Program>,
    @InjectRepository(ProgramExercise)
    private readonly programExercises: Repository<ProgramExercise>,
    @InjectRepository(UserProgramAssignment)
    private readonly assignments: Repository<UserProgramAssignment>,
    @InjectRepository(Exercise) private readonly exercises: Repository<Exercise>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('SEED_ON_BOOT', { infer: true })) return;
    if (this.config.get('NODE_ENV', { infer: true }) === NodeEnv.TEST) return;
    try {
      const upserted = await this.seedPresets();
      if (upserted > 0) this.logger.log(`Пресет-програми: синхронізовано ${upserted}`);
      const backfilled = await this.backfillAssignments();
      if (backfilled > 0)
        this.logger.log(`Призначено дефолтну програму ${backfilled} сім'ям без активної`);
    } catch (error) {
      this.logger.warn(
        `Не вдалося заповнити пресет-програми (чи виконано міграції?): ${String(error)}`,
      );
    }
  }

  /**
   * Перезаписує лише ЗМІНЕНІ пресети й у транзакції. Раніше при кожному старті склад УСІХ пресетів
   * видалявся й вставлявся заново поза транзакцією: під час деплою попередній екземпляр, що ще обслуговує
   * запити, міг прочитати порожню програму («Сьогодні» без вправ), а старт робив сотні зайвих запитів.
   */
  private async seedPresets(): Promise<number> {
    const [catalog, programs] = await Promise.all([
      this.exercises.find({ select: { id: true, slug: true } }),
      this.programs.find({ where: { slug: In(ALL_PRESETS.map((p) => p.slug)) } }),
    ]);
    const exerciseIdBySlug = new Map(catalog.map((e) => [e.slug, e.id]));
    const programBySlug = new Map(programs.map((p) => [p.slug, p]));
    const currentRows = programs.length
      ? await this.programExercises.find({
          where: { programId: In(programs.map((p) => p.id)) },
          order: { sortOrder: 'ASC' },
        })
      : [];

    let upserted = 0;
    for (const preset of ALL_PRESETS) {
      const existing = programBySlug.get(preset.slug) ?? null;
      // змінений/архівований у CRM пресет — джерело правди БД, seed його не перезаписує
      if (existing?.managedByAdmin) continue;

      const rows: RowSeed[] = [];
      for (const [index, item] of preset.exercises.entries()) {
        const exerciseId = exerciseIdBySlug.get(item.exerciseSlug);
        if (!exerciseId) {
          this.logger.warn(
            `Пресет ${preset.slug}: невідома вправа ${item.exerciseSlug}, пропущено`,
          );
          continue;
        }
        rows.push({
          exerciseId,
          sortOrder: index + 1,
          targetReps: item.targetReps ?? null,
          targetSeconds: item.targetSeconds ?? null,
          targetSteps: item.targetSteps ?? null,
          planDays: item.planDays,
        });
      }
      const fields = {
        name: preset.name,
        description: preset.description,
        highlights: preset.highlights,
        durationType: preset.durationType,
        isPreset: true,
        createdById: null,
      };
      const archived = !!preset.archived;

      if (existing) {
        const sameProgram =
          stableJson(pick(existing, fields)) === stableJson(fields) &&
          (existing.archivedAt !== null) === archived;
        const sameRows =
          stableJson(currentRows.filter((r) => r.programId === existing.id).map(toRowSeed)) ===
          stableJson(rows);
        if (sameProgram && sameRows) continue;
      }

      await this.programs.manager.transaction(async (tx) => {
        const program = await tx.getRepository(Program).save(
          tx.getRepository(Program).create({
            ...existing,
            slug: preset.slug,
            ...fields,
            // застарілий пресет ховаємо з каталогу (дата архівації не перезаписується)
            archivedAt: archived ? (existing?.archivedAt ?? new Date()) : null,
          }),
        );
        const repo = tx.getRepository(ProgramExercise);
        await repo.delete({ programId: program.id });
        if (rows.length > 0)
          await repo.insert(rows.map((row) => ({ ...row, programId: program.id })));
      });
      upserted += 1;
    }
    return upserted;
  }

  /** Одним SQL: дефолтна програма всім сім'ям без активної (раніше — 2 запити на КОЖНУ сім'ю) */
  private async backfillAssignments(): Promise<number> {
    const defaultProgram = await this.programs.findOne({
      where: { slug: DEFAULT_PRESET_SLUG },
      select: { id: true },
    });
    if (!defaultProgram) return 0;
    const inserted: unknown[] = await this.assignments.query(
      `INSERT INTO user_program_assignments (family_id, program_id, assigned_by_id, start_date, is_active)
       SELECT f.id, $1, f.child_id, $2::date, true
         FROM families f
        WHERE NOT EXISTS (
          SELECT 1 FROM user_program_assignments a WHERE a.family_id = f.id AND a.is_active)
       RETURNING id`,
      [defaultProgram.id, new Date().toISOString().slice(0, 10)],
    );
    return inserted.length;
  }
}

type RowSeed = Pick<
  ProgramExercise,
  'exerciseId' | 'sortOrder' | 'targetReps' | 'targetSeconds' | 'targetSteps' | 'planDays'
>;

function toRowSeed(row: ProgramExercise): RowSeed {
  return {
    exerciseId: row.exerciseId,
    sortOrder: row.sortOrder,
    targetReps: row.targetReps,
    targetSeconds: row.targetSeconds,
    targetSteps: row.targetSteps,
    planDays: row.planDays,
  };
}

function pick<T extends object>(source: object, shape: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(shape)) out[key] = (source as Record<string, unknown>)[key] ?? null;
  return out as Partial<T>;
}

/** JSON з відсортованими ключами: jsonb у Postgres не зберігає порядок ключів */
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v === undefined
        ? null
        : v,
  );
}
