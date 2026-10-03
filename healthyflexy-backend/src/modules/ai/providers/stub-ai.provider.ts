import { Injectable, Logger } from '@nestjs/common';
import { AppLanguage } from '../../../common/enums';
import { AiAnalysisResult, AiExerciseInput, AiVisionProvider } from '../ai-provider.interface';

const STUB_TEXT: Record<AppLanguage, { feedback: string; recommendations: string }> = {
  [AppLanguage.UK]: {
    feedback: 'Форма виглядає правильно, рух виконано в безпечній амплітуді.',
    recommendations: 'Продовжуйте в тому ж темпі, стежте за диханням.',
  },
  [AppLanguage.RU]: {
    feedback: 'Техника выглядит правильно, движение выполнено в безопасной амплитуде.',
    recommendations: 'Продолжайте в том же темпе, следите за дыханием.',
  },
  [AppLanguage.PL]: {
    feedback: 'Technika wygląda poprawnie, ruch wykonany w bezpiecznym zakresie.',
    recommendations: 'Kontynuuj w tym samym tempie, pilnuj oddechu.',
  },
  [AppLanguage.EN]: {
    feedback: 'Your form looks right, the movement was done in a safe range.',
    recommendations: 'Keep the same pace and watch your breathing.',
  },
};

/**
 * Dev/test-провайдер: НІЧОГО не аналізує, завжди повертає ОДИН і той самий позитивний результат
 * без реального виклику AI (детерміновано — так само, як `ConsoleEmailProvider` завжди «успішний»,
 * і так e2e-тести лишаються стабільними). ⚠️ Тому зі stub будь-яка вправа з кадрами зараховується —
 * навіть порожня кімната. Не для production (AI_PROVIDER=openai); стартова діагностика про це попереджає.
 * Щоб вручну перевірити гілку відхилення — тимчасово виставте AI_SCORE_THRESHOLD вище 90.
 */
@Injectable()
export class StubAiProvider implements AiVisionProvider {
  private readonly logger = new Logger(StubAiProvider.name);

  analyzeExercisePhotos(input: AiExerciseInput): Promise<AiAnalysisResult> {
    this.logger.warn(
      `🤖 AI_PROVIDER=stub: «${input.exerciseName}» → фейковий позитивний результат (реального аналізу НЕ було)`,
    );
    return Promise.resolve({
      isCorrect: true,
      score: 90,
      ...(STUB_TEXT[input.language] ?? STUB_TEXT[AppLanguage.UK]),
      framesAnalyzed: input.frameCount,
      personVisibleFrames: input.frameCount,
      windowsPerformed: input.windows.length,
      windowsTotal: input.windows.length,
      movementDetected: true,
      matchesExercise: true,
      issues: [],
    });
  }
}
