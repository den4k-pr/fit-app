import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants';
import { AppLanguage } from '../../common/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { LocalizedText } from '../../common/types';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ProgramExercise } from '../programs/entities/program-exercise.entity';
import { Program } from '../programs/entities/program.entity';
import {
  CreateExerciseDto,
  CreateProgramDto,
  LocalizedTextDto,
  UpdateExerciseDto,
  UpdateProgramDto,
} from './dto/admin.dto';

/** Порожні мови заповнюються українською — застосунок завжди має текст будь-якою мовою */
export function fillLocales(text: LocalizedTextDto): LocalizedText {
  const uk = text.uk.trim();
  const pick = (v?: string) => (v?.trim() ? v.trim() : uk);
  return {
    [AppLanguage.UK]: uk,
    [AppLanguage.RU]: pick(text.ru),
    [AppLanguage.PL]: pick(text.pl),
    [AppLanguage.EN]: pick(text.en),
  };
}

const fillOptional = (text: LocalizedTextDto | null | undefined) =>
  text === undefined ? undefined : text === null ? null : fillLocales(text);

/** Довідник вправ і базовий пакет програм (пресети) у CRM */
@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Exercise) private readonly exercises: Repository<Exercise>,
    @InjectRepository(Program) private readonly programs: Repository<Program>,
    @InjectRepository(ProgramExercise)
    private readonly programExercises: Repository<ProgramExercise>,
  ) {}

  // ───── вправи ─────

  async listExercises() {
    const rows = await this.exercises.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
    const usage = await this.dataSource.query<{ id: string; programs: number; done: number }[]>(
      `SELECT e.id,
              (SELECT count(DISTINCT pe.program_id) FROM program_exercises pe WHERE pe.exercise_id = e.id)::int AS programs,
              (SELECT count(*) FROM exercise_records r WHERE r.exercise_id = e.id)::int AS done
         FROM exercises e`,
    );
    const byId = new Map(usage.map((u) => [u.id, u]));
    return rows.map((e) => ({
      ...e,
      usage: { programs: byId.get(e.id)?.programs ?? 0, done: byId.get(e.id)?.done ?? 0 },
    }));
  }

  async getExercise(id: string) {
    return this.findExercise(id);
  }

  async createExercise(dto: CreateExerciseDto) {
    await this.assertSlugFree(dto.slug);
    this.assertTarget(dto);
    const saved = await this.exercises.save(
      this.exercises.create({ ...this.exerciseFields(dto), managedByAdmin: true }),
    );
    return this.findExercise(saved.id);
  }

  async updateExercise(id: string, dto: UpdateExerciseDto) {
    const current = await this.findExercise(id);
    if (dto.slug && dto.slug !== current.slug) await this.assertSlugFree(dto.slug, id);
    const merged = { ...current, ...this.exerciseFields(dto), managedByAdmin: true };
    this.assertTarget(merged);
    await this.exercises.save(merged);
    return this.findExercise(id);
  }

  /**
   * Видалення: якщо вправу вже виконували або вона є в програмах — лише вимикається (історія й звіти
   * посилаються на неї); інакше видаляється повністю.
   */
  async removeExercise(id: string): Promise<{ deleted: boolean; deactivated: boolean }> {
    const exercise = await this.findExercise(id);
    const [{ used }] = await this.dataSource.query<{ used: boolean }[]>(
      `SELECT EXISTS (SELECT 1 FROM exercise_records WHERE exercise_id = $1)
           OR EXISTS (SELECT 1 FROM exercise_attempt_logs WHERE exercise_id = $1)
           OR EXISTS (SELECT 1 FROM program_exercises WHERE exercise_id = $1) AS used`,
      [id],
    );
    if (used) {
      await this.exercises.update(id, { isActive: false, managedByAdmin: true });
      return { deleted: false, deactivated: true };
    }
    await this.exercises.delete(exercise.id);
    return { deleted: true, deactivated: false };
  }

  // ───── програми (базовий пакет) ─────

  async listPrograms() {
    const rows = await this.programs.find({
      where: { isPreset: true },
      relations: { exercises: { exercise: true } },
      order: { createdAt: 'ASC', exercises: { sortOrder: 'ASC' } },
    });
    const usage = await this.dataSource.query<{ programId: string; families: number }[]>(
      `SELECT program_id AS "programId", count(*)::int AS families
         FROM user_program_assignments WHERE is_active GROUP BY program_id`,
    );
    const byId = new Map(usage.map((u) => [u.programId, u.families]));
    return rows.map((p) => ({ ...this.programView(p), families: byId.get(p.id) ?? 0 }));
  }

  async getProgram(id: string) {
    return this.programView(await this.findPreset(id));
  }

  async createProgram(dto: CreateProgramDto) {
    if (dto.slug) await this.assertProgramSlugFree(dto.slug);
    await this.assertExercisesExist(dto.exercises.map((e) => e.exerciseId));
    const id = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(Program).save(
        manager.getRepository(Program).create({
          slug: dto.slug ?? null,
          name: fillLocales(dto.name),
          description: fillOptional(dto.description) ?? null,
          highlights: dto.highlights.map(fillLocales),
          durationType: dto.durationType,
          isPreset: true,
          managedByAdmin: true,
          createdById: null,
        }),
      );
      await this.saveProgramExercises(
        manager.getRepository(ProgramExercise),
        saved.id,
        dto.exercises,
      );
      return saved.id;
    });
    return this.getProgram(id);
  }

  async updateProgram(id: string, dto: UpdateProgramDto) {
    const program = await this.findPreset(id);
    if (dto.slug && dto.slug !== program.slug) await this.assertProgramSlugFree(dto.slug, id);
    if (dto.exercises) await this.assertExercisesExist(dto.exercises.map((e) => e.exerciseId));
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Program).update(id, {
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.name ? { name: fillLocales(dto.name) } : {}),
        ...(dto.description !== undefined ? { description: fillOptional(dto.description) } : {}),
        ...(dto.highlights ? { highlights: dto.highlights.map(fillLocales) } : {}),
        ...(dto.durationType ? { durationType: dto.durationType } : {}),
        managedByAdmin: true,
      });
      if (dto.exercises) {
        const repo = manager.getRepository(ProgramExercise);
        await repo.delete({ programId: id });
        await this.saveProgramExercises(repo, id, dto.exercises);
      }
    });
    return this.getProgram(id);
  }

  /** Сховати з каталогу / повернути. Сім'ї, яким пресет уже призначено, продовжують за ним займатися. */
  async setArchived(id: string, archived: boolean) {
    await this.findPreset(id);
    await this.programs.update(id, {
      archivedAt: archived ? new Date() : null,
      managedByAdmin: true,
    });
    return this.getProgram(id);
  }

  /** Видалення: якщо пресет комусь призначали — лише архівується; інакше видаляється повністю */
  async removeProgram(id: string): Promise<{ deleted: boolean; archived: boolean }> {
    await this.findPreset(id);
    const assigned = await this.dataSource.query<unknown[]>(
      `SELECT 1 FROM user_program_assignments WHERE program_id = $1 LIMIT 1`,
      [id],
    );
    if (assigned.length > 0) {
      await this.setArchived(id, true);
      return { deleted: false, archived: true };
    }
    await this.programs.delete(id);
    return { deleted: true, archived: false };
  }

  // ───── допоміжне ─────

  private exerciseFields(dto: UpdateExerciseDto): Partial<Exercise> {
    const out: Partial<Exercise> = {};
    const copy = [
      'slug',
      'category',
      'aiCriteria',
      'targetReps',
      'targetSeconds',
      'targetSteps',
      'recordMaxSec',
      'workoutTypes',
      'durationMin',
      'bodyImpact',
      'demoVideoUrl',
      'sourceTitle',
      'sourceUrl',
      'sortOrder',
      'isActive',
      'variantGroup',
      'voicePattern',
    ] as const;
    for (const key of copy) {
      if (dto[key] !== undefined) (out as Record<string, unknown>)[key] = dto[key];
    }
    if (dto.name) out.name = fillLocales(dto.name);
    if (dto.benefit) out.benefit = fillLocales(dto.benefit);
    if (dto.description !== undefined) out.description = fillOptional(dto.description) ?? null;
    if (dto.safetyInstructions !== undefined)
      out.safetyInstructions = fillOptional(dto.safetyInstructions) ?? null;
    if (dto.muscles) out.muscles = dto.muscles.map(fillLocales);
    if (typeof out.aiCriteria === 'string' && !out.aiCriteria.trim()) out.aiCriteria = null;
    return out;
  }

  private assertTarget(e: {
    targetReps?: number | null;
    targetSeconds?: number | null;
    targetSteps?: number | null;
  }) {
    if (e.targetReps == null && e.targetSeconds == null && e.targetSteps == null) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'Укажите цель: повторения, секунды или шаги',
      );
    }
  }

  private async assertSlugFree(slug: string, exceptId?: string) {
    const taken = await this.exercises.exists({
      where: { slug, ...(exceptId ? { id: Not(exceptId) } : {}) },
    });
    if (taken)
      throw new AppException(ErrorCode.SLUG_TAKEN, HttpStatus.CONFLICT, 'Такой ключ уже занят');
  }

  private async assertProgramSlugFree(slug: string, exceptId?: string) {
    const taken = await this.programs.exists({
      where: { slug, ...(exceptId ? { id: Not(exceptId) } : {}) },
    });
    if (taken)
      throw new AppException(ErrorCode.SLUG_TAKEN, HttpStatus.CONFLICT, 'Такой ключ уже занят');
  }

  private async assertExercisesExist(ids: string[]) {
    const unique = [...new Set(ids)];
    const found = await this.exercises.count({ where: { id: In(unique) } });
    if (found !== unique.length)
      throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, 'Exercise not found');
  }

  private async findExercise(id: string): Promise<Exercise> {
    const exercise = await this.exercises.findOne({ where: { id } });
    if (!exercise)
      throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, 'Exercise not found');
    return exercise;
  }

  private async findPreset(id: string): Promise<Program> {
    const program = await this.programs.findOne({
      where: { id, isPreset: true },
      relations: { exercises: { exercise: true } },
      order: { exercises: { sortOrder: 'ASC' } },
    });
    if (!program) throw new AppException(ErrorCode.PROGRAM_NOT_FOUND, HttpStatus.NOT_FOUND);
    return program;
  }

  private programView(p: Program) {
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      highlights: p.highlights ?? [],
      durationType: p.durationType,
      archivedAt: p.archivedAt?.toISOString() ?? null,
      managedByAdmin: p.managedByAdmin,
      updatedAt: p.updatedAt.toISOString(),
      exercises: [...(p.exercises ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((pe) => ({
          exerciseId: pe.exerciseId,
          slug: pe.exercise.slug,
          name: pe.exercise.name,
          category: pe.exercise.category,
          targetReps: pe.targetReps,
          targetSeconds: pe.targetSeconds,
          targetSteps: pe.targetSteps,
          defaults: {
            targetReps: pe.exercise.targetReps,
            targetSeconds: pe.exercise.targetSeconds,
            targetSteps: pe.exercise.targetSteps,
          },
          planDays: pe.planDays,
        })),
    };
  }

  private async saveProgramExercises(
    repo: Repository<ProgramExercise>,
    programId: string,
    items: CreateProgramDto['exercises'],
  ) {
    await repo.save(
      items.map((e, index) =>
        repo.create({
          programId,
          exerciseId: e.exerciseId,
          sortOrder: index + 1,
          targetReps: e.targetReps ?? null,
          targetSeconds: e.targetSeconds ?? null,
          targetSteps: e.targetSteps ?? null,
          planDays: [...e.planDays].sort(),
        }),
      ),
    );
  }
}
