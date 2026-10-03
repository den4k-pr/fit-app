import { AppLanguage } from '../../common/enums';
import { LocalizedText } from '../../common/types';
import { ProgramExercise } from './entities/program-exercise.entity';
import { Program } from './entities/program.entity';
import { UserProgramAssignment } from './entities/user-program-assignment.entity';
import { AssignmentResponseDto, ProgramExerciseResponseDto, ProgramResponseDto } from './dto';

/** Власна програма створюється в ОДНІЙ мові (UI користувача): дублюємо той самий текст на всі ключі. */
export function duplicateAcrossLocales(text: string): LocalizedText {
  return {
    [AppLanguage.UK]: text,
    [AppLanguage.PL]: text,
    [AppLanguage.EN]: text,
    [AppLanguage.RU]: text,
  };
}

function localize(text: LocalizedText, language: AppLanguage): string {
  return text[language] || text[AppLanguage.EN] || text[AppLanguage.UK];
}

export function toProgramExerciseResponse(
  pe: ProgramExercise,
  language: AppLanguage,
): ProgramExerciseResponseDto {
  return {
    exerciseId: pe.exerciseId,
    slug: pe.exercise.slug,
    category: pe.exercise.category,
    name: localize(pe.exercise.name, language),
    sortOrder: pe.sortOrder,
    targetReps: pe.targetReps ?? pe.exercise.targetReps,
    targetSeconds: pe.targetSeconds ?? pe.exercise.targetSeconds,
    targetSteps: pe.targetSteps ?? pe.exercise.targetSteps,
    planDays: pe.planDays,
    benefit: localize(pe.exercise.benefit, language),
    variantGroup: pe.exercise.variantGroup ?? null,
  };
}

export function toProgramResponse(program: Program, language: AppLanguage): ProgramResponseDto {
  return {
    id: program.id,
    name: localize(program.name, language),
    description: program.description ? localize(program.description, language) : null,
    highlights: (program.highlights ?? []).map((h) => localize(h, language)),
    durationType: program.durationType,
    isPreset: program.isPreset,
    createdById: program.createdById,
    exercises: [...program.exercises]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((pe) => toProgramExerciseResponse(pe, language)),
  };
}

export function toAssignmentResponse(
  assignment: UserProgramAssignment,
  language: AppLanguage,
): AssignmentResponseDto {
  return {
    id: assignment.id,
    programId: assignment.programId,
    programName: localize(assignment.program.name, language),
    startDate: assignment.startDate,
    isActive: assignment.isActive,
  };
}
