import dataSource from '../data-source';
import { Exercise } from '../../modules/exercises/entities/exercise.entity';
import { Program } from '../../modules/programs/entities/program.entity';
import { ProgramExercise } from '../../modules/programs/entities/program-exercise.entity';
import { ALL_EXERCISES_SEED } from '../../modules/exercises/exercises.seeder';
import { FITNESS_PROGRAMS_SEED, PROGRAMS_SEED } from './programs.seed-data';

/** Ідемпотентний seed: `npm run seed` (upsert за slug). */
async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    const allExercises = ALL_EXERCISES_SEED;
    await dataSource.getRepository(Exercise).upsert(allExercises, ['slug']);
    console.log(`Seeded ${allExercises.length} exercises`);

    const exercises = await dataSource.getRepository(Exercise).find();
    const exerciseIdBySlug = new Map(exercises.map((e) => [e.slug, e.id]));

    const programRepo = dataSource.getRepository(Program);
    const programExerciseRepo = dataSource.getRepository(ProgramExercise);
    for (const preset of [...FITNESS_PROGRAMS_SEED, ...PROGRAMS_SEED]) {
      const existing = await programRepo.findOne({ where: { slug: preset.slug } });
      const program = await programRepo.save(
        programRepo.create({
          ...existing,
          slug: preset.slug,
          name: preset.name,
          description: preset.description,
          highlights: preset.highlights,
          durationType: preset.durationType,
          isPreset: true,
          createdById: null,
          archivedAt: preset.archived ? (existing?.archivedAt ?? new Date()) : null,
        }),
      );
      await programExerciseRepo.delete({ programId: program.id });
      await programExerciseRepo.save(
        preset.exercises.map((e, index) => {
          const exerciseId = exerciseIdBySlug.get(e.exerciseSlug);
          if (!exerciseId)
            throw new Error(`Unknown exercise slug in preset seed: ${e.exerciseSlug}`);
          return programExerciseRepo.create({
            programId: program.id,
            exerciseId,
            sortOrder: index + 1,
            targetReps: e.targetReps ?? null,
            targetSeconds: e.targetSeconds ?? null,
            targetSteps: e.targetSteps ?? null,
            planDays: e.planDays,
          });
        }),
      );
    }
    console.log(`Seeded ${FITNESS_PROGRAMS_SEED.length + PROGRAMS_SEED.length} preset programs`);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
