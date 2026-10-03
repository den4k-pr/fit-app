import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants';
import { AppLanguage } from '../../common/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { LocalizedText } from '../../common/types';
import { ExerciseInfoDto, ExerciseResponseDto } from './dto';
import { Exercise } from './entities/exercise.entity';

/** Довідник вправ: активні за sortOrder, тексти мовою користувача (fallback: en). */
@Injectable()
export class ExercisesService {
  constructor(@InjectRepository(Exercise) private readonly exercises: Repository<Exercise>) {}

  /** Текст мовою користувача; немає перекладу — англійська, далі українська */
  localize(text: LocalizedText, language: AppLanguage): string {
    return text[language] || text[AppLanguage.EN] || text[AppLanguage.UK];
  }

  /** Сирі активні вправи (для Workouts): порядок = порядок проходження */
  findActive(): Promise<Exercise[]> {
    return this.exercises.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
  }

  countActive(): Promise<number> {
    return this.exercises.count({ where: { isActive: true } });
  }

  async listActive(language: AppLanguage): Promise<ExerciseResponseDto[]> {
    return (await this.findActive()).map((e) => this.toResponse(e, language));
  }

  async getById(id: string, language: AppLanguage): Promise<ExerciseResponseDto> {
    const exercise = await this.exercises.findOne({ where: { id } });
    if (!exercise) throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
    return this.toResponse(exercise, language);
  }

  /** Довідкові дані для карток («Вплив на організм», м'язи, тривалість, джерело) */
  info(e: Exercise, language: AppLanguage): ExerciseInfoDto {
    return {
      category: e.category,
      workoutTypes: e.workoutTypes ?? [],
      durationMin: e.durationMin,
      bodyImpact: e.bodyImpact ?? null,
      muscles: (e.muscles ?? []).map((m) => this.localize(m, language)),
      sourceTitle: e.sourceTitle,
      sourceUrl: e.sourceUrl,
      benefit: this.localize(e.benefit, language),
      description: e.description ? this.localize(e.description, language) : null,
      voicePattern: e.voicePattern ?? null,
      variantGroup: e.variantGroup ?? null,
    };
  }

  toResponse(e: Exercise, language: AppLanguage): ExerciseResponseDto {
    return {
      id: e.id,
      slug: e.slug,
      sortOrder: e.sortOrder,
      category: e.category,
      name: this.localize(e.name, language),
      targetReps: e.targetReps,
      targetSeconds: e.targetSeconds,
      targetSteps: e.targetSteps,
      recordMaxSec: e.recordMaxSec,
      demoVideoUrl: e.demoVideoUrl,
      benefit: this.localize(e.benefit, language),
      sourceTitle: e.sourceTitle,
      sourceUrl: e.sourceUrl,
      info: this.info(e, language),
    };
  }
}
