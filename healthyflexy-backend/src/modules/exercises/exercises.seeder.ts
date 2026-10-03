import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EnvironmentVariables, NodeEnv } from '../../config';
import { AI_ROTATION_EXERCISES_SEED } from '../../database/seeds/ai-rotation-exercises.seed-data';
import { ELDERLY_EXERCISES_SEED } from '../../database/seeds/elderly-exercises.seed-data';
import { EXERCISES_SEED } from '../../database/seeds/exercises.seed-data';
import { FITNESS_EXERCISES_SEED } from '../../database/seeds/fitness-exercises.seed-data';
import {
  VIDEO_EXERCISE_SLUGS,
  VIDEO_EXERCISES_SEED,
} from '../../database/seeds/video-exercises.seed-data';
import { Exercise } from './entities/exercise.entity';

const VIDEO_SLUGS = new Set<string>(VIDEO_EXERCISE_SLUGS);

/**
 * Каталог = лише вправи з демо-роликами (`VIDEO_EXERCISES_SEED`). Інші вправи попередніх наборів лишаються в БД
 * (на них посилаються виконані дні), але вимкнені — у день, каталог і ШІ-підбір не потрапляють.
 */
export const ALL_EXERCISES_SEED = [
  ...[
    ...EXERCISES_SEED,
    ...ELDERLY_EXERCISES_SEED,
    ...FITNESS_EXERCISES_SEED,
    ...AI_ROTATION_EXERCISES_SEED,
  ]
    .filter((e) => !VIDEO_SLUGS.has(e.slug))
    .map((e) => ({ ...e, isActive: false })),
  ...VIDEO_EXERCISES_SEED,
];

/**
 * Довідник вправ при старті (після міграцій): UPSERT за slug — виправлення перекладів у seed-файлі доходять
 * до вже засіяної БД. Вправи, змінені в CRM (`managedByAdmin`), seed не чіпає: після першої правки в адмінці
 * джерело правди для такої вправи — БД.
 */
@Injectable()
export class ExercisesSeeder implements OnModuleInit {
  private readonly logger = new Logger(ExercisesSeeder.name);

  constructor(
    @InjectRepository(Exercise) private readonly exercises: Repository<Exercise>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.get('SEED_ON_BOOT', { infer: true })) return;
    if (this.config.get('NODE_ENV', { infer: true }) === NodeEnv.TEST) return;
    try {
      const managed = await this.exercises.find({
        where: { slug: In(ALL_EXERCISES_SEED.map((e) => e.slug)), managedByAdmin: true },
        select: { slug: true },
      });
      const skip = new Set(managed.map((e) => e.slug));
      const rows = ALL_EXERCISES_SEED.filter((e) => !skip.has(e.slug));
      if (rows.length > 0) await this.exercises.upsert(rows, ['slug']);
      this.logger.log(
        `Довідник вправ: синхронізовано ${rows.length}, змінених у CRM пропущено ${skip.size}`,
      );
    } catch (error) {
      this.logger.warn(
        `Не вдалося заповнити довідник вправ (чи виконано міграції?): ${String(error)}`,
      );
    }
  }
}
