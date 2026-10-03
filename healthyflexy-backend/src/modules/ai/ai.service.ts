import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_ANALYSIS, AI_PROVIDER, ErrorCode } from '../../common/constants';
import { AppException } from '../../common/exceptions/app.exception';
import { EnvironmentVariables } from '../../config';
import { AiAnalysisResult, AiExerciseInput, AiVisionProvider } from './ai-provider.interface';

/**
 * Фасад над AiVisionProvider: мережева помилка АБО нерелевантна/невалідна відповідь моделі
 * (п.6 ТЗ: edge case) НІКОЛИ не трактується як «вправа неправильна» — це AI_ANALYSIS_FAILED,
 * клієнт бачить «спробувати ще раз», спроба НЕ пишеться в ExerciseAttemptLog.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiVisionProvider,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  get providerName(): string {
    return this.config.get('AI_PROVIDER', { infer: true });
  }

  get scoreThreshold(): number {
    return this.config.get('AI_SCORE_THRESHOLD', { infer: true });
  }

  async analyze(input: AiExerciseInput): Promise<AiAnalysisResult> {
    const started = Date.now();
    try {
      const result = await this.provider.analyzeExercisePhotos(input);
      this.logger.log({
        event: 'ai_analysis',
        provider: this.providerName,
        exercise: input.exerciseName,
        score: result.score,
        isCorrect: result.isCorrect,
        personVisibleFrames: result.personVisibleFrames,
        framesAnalyzed: result.framesAnalyzed,
        windows: `${result.windowsPerformed}/${result.windowsTotal}`,
        movementDetected: result.movementDetected,
        matchesExercise: result.matchesExercise,
        ms: Date.now() - started,
      });
      return result;
    } catch (error) {
      this.logger.error({
        event: 'ai_analysis_failed',
        provider: this.providerName,
        exercise: input.exerciseName,
        ms: Date.now() - started,
        reason: String(error instanceof Error ? error.message : error),
      });
      throw new AppException(ErrorCode.AI_ANALYSIS_FAILED, HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * Перевірка зарахування: людина видна щонайменше в половині кадрів, це саме ця вправа (або її складніший
   * різновид), є рух (для рухових вправ) щонайменше в половині відрізків часу, і оцінка не нижче порогу.
   * `isCorrect = false` при впевненій оцінці (≥ AI_ANALYSIS.CONFIDENT_SCORE) не блокує: модель іноді ставить
   * false за дрібниці (віджимання від підлоги замість опори — оцінка 70, а вправу довелося переробляти).
   */
  accepts(result: AiAnalysisResult, requiresMovement: boolean): boolean {
    const visibleRatio =
      result.framesAnalyzed > 0 ? result.personVisibleFrames / result.framesAnalyzed : 0;
    return (
      visibleRatio >= AI_ANALYSIS.MIN_PERSON_VISIBLE_RATIO &&
      result.matchesExercise &&
      (!requiresMovement ||
        (result.movementDetected &&
          result.windowsPerformed * 2 >= Math.max(1, result.windowsTotal))) &&
      (result.isCorrect || result.score >= AI_ANALYSIS.CONFIDENT_SCORE) &&
      result.score >= this.scoreThreshold
    );
  }
}
