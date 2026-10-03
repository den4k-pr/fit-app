import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_ANALYSIS } from '../../../common/constants';
import { AppLanguage } from '../../../common/enums';
import { EnvironmentVariables } from '../../../config';
import {
  AiAnalysisResult,
  AiExerciseInput,
  AiVisionProvider,
  AttemptIssue,
} from '../ai-provider.interface';
import type { TimeWindow } from '../storyboard';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/** Назва мови для промпта (модель пише відгук мовою виконавця) */
const LANGUAGE_NAME: Record<AppLanguage, string> = {
  [AppLanguage.UK]: 'Ukrainian',
  [AppLanguage.RU]: 'Russian',
  [AppLanguage.PL]: 'Polish',
  [AppLanguage.EN]: 'English',
};

/**
 * Модель бачить РОЗКАДРОВКУ (кадри вправи в сітках, по порядку) і оцінює рух ВІДРІЗКАМИ часу, а не кожен кадр:
 * повторювана вправа на окремому кадрі часто в «паузі між повторами», і це нормально. Рух — це різниця між
 * сусідніми кадрами. Оцінюється суть руху, а не обстановка (стілець ↔ ліжко, стіна ↔ шафа тощо).
 * Сумніви щодо того, чи рух узагалі був, — на користь відмови.
 */
const SYSTEM_PROMPT = [
  'You are a physiotherapist verifying that an adult really performed a specific home exercise. The users are ordinary, reasonably mobile adults (often 40-70 years old) exercising at home.',
  'You get a STORYBOARD: frames taken automatically by the phone camera at even intervals during the exercise, arranged in grid sheets. Inside each sheet frames go left-to-right, then top-to-bottom; the text before each sheet lists which frame numbers and seconds it contains.',
  'Movement is the DIFFERENCE between neighbouring frames. Always compare frames with each other — never judge a single frame in isolation.',
  'For repetitive exercises it is NORMAL that many frames show the rest position between repetitions (e.g. standing between squats, arms up between push-ups). That is not a mistake.',
  'Work step by step:',
  '1. Count in how many frames a real person is clearly visible (not a poster, screen or empty room) → "personVisibleFrames".',
  '2. For EACH time window listed in the request, look at all frames of that window together and decide "performed": did the movement of this exercise happen at least once within the window (the pose changes the way this exercise requires)? If not, give a short "issue" (max 8 words, in the language requested below) — what was missing; otherwise an empty string. Use the SAME wording for the same problem in neighbouring windows.',
  '3. "movementDetected": across the whole storyboard, does the pose change the way this exercise requires?',
  '4. "matchesExercise": is the person doing THIS movement pattern (not some other activity)?',
  '5. Only then give "isCorrect" and a "score" 0-100 for the whole exercise.',
  'What matters is the MOVEMENT itself, not the surroundings:',
  '- Furniture and props are interchangeable: a chair may be a bed, sofa, stool or any seat; a wall may be a door, wardrobe or counter; a table for incline push-ups may be any stable surface. Never penalise a different or missing prop.',
  '- Room, clothing, lighting, camera angle and background do not matter, as long as the relevant body parts are visible.',
  '- Judge form reasonably: a home exerciser may move with a smaller range or slower tempo — fine, as long as the movement clearly happens and the pattern is right.',
  '- If a window shows the movement in at least one or two frames, that window is performed.',
  '- A HARDER or neighbouring variant of the same movement counts as correct: push-ups from the floor or from the knees instead of incline/wall push-ups, full squats instead of chair squats, a deeper lunge, etc. Never reject because the person chose a more difficult variant or a different support.',
  '- Floor exercises (dead bug, bridge, bird dog, plank): the camera often sees the person from the side or at an angle and some limbs may overlap — judge the alternating pattern as a whole and do not demand a perfect side view.',
  '- Small imperfections of form (range, tempo, slightly bent arm) are NOT a reason to reject: accept (isCorrect=true) and put a friendly tip in "recommendations".',
  'Rules:',
  '- If no person is visible in most frames, or the frames are empty, black or all identical: isCorrect=false, score=0.',
  '- If the person stays still for the whole exercise while it requires movement: movementDetected=false, isCorrect=false. For hold exercises (plank, balance stand) the person must keep the required position.',
  '- If you are unsure whether the movement happened at all, reject. Never invent movement that is not visible.',
  '- Do not give medical diagnoses.',
  '"feedback" and "recommendations": 1-2 short friendly sentences each, written ONLY in the language requested in the user message (the person reads them in that language).',
  'NEVER mention photos, frames, pictures, images, sheets, storyboard or screenshots in "feedback", "recommendations" or "issue": the person does not know the app takes pictures. Talk about the exercise and, when useful, the seconds (e.g. "from second 12 to 18 the knees did not bend").',
  'If you reject, "feedback" says plainly what was wrong and "recommendations" how to fix THAT SAME problem (e.g. feedback: "the arm and the opposite leg did not go down"; recommendations: "lower one arm behind your head and the opposite leg towards the floor at the same time, then switch"). "recommendations" must never contradict or simply repeat the starting position from the description — it must address exactly the problem named in "feedback" and in the "issue" texts.',
  'Call the exercise by the name given in the request; do not invent other names for it.',
].join('\n');

/** Structured Outputs: модель зобов'язана повернути рівно цю форму (strict) */
const RESPONSE_SCHEMA = {
  name: 'exercise_verification',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'personVisibleFrames',
      'windows',
      'movementDetected',
      'matchesExercise',
      'isCorrect',
      'score',
      'feedback',
      'recommendations',
    ],
    properties: {
      personVisibleFrames: { type: 'integer' },
      windows: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['performed', 'issue'],
          properties: {
            performed: { type: 'boolean' },
            issue: { type: 'string' },
          },
        },
      },
      movementDetected: { type: 'boolean' },
      matchesExercise: { type: 'boolean' },
      isCorrect: { type: 'boolean' },
      score: { type: 'integer' },
      feedback: { type: 'string' },
      recommendations: { type: 'string' },
    },
  },
} as const;

/**
 * OpenAI Vision через звичайний `fetch` (без SDK). Розкадровка йде як data-URL (base64 JPEG) — сервер сам
 * читає кадри зі сховища, тож OpenAI не потрібен доступ до наших файлів. `detail: high` для сітки 960×640:
 * зображення не зменшується, ціна фіксована (~765 токенів за сітку).
 */
@Injectable()
export class OpenAiVisionProvider implements AiVisionProvider {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  async analyzeExercisePhotos(input: AiExerciseInput): Promise<AiAnalysisResult> {
    const apiKey = this.config.get('OPENAI_API_KEY', { infer: true });
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

    const windowsText = input.windows
      .map(
        (w, i) =>
          `Window ${i + 1}: seconds ${w.fromSec}–${w.toSec} (frames ${w.firstFrame}–${w.lastFrame})`,
      )
      .join('\n');
    const userText = [
      `Exercise: ${input.exerciseName}`,
      input.exerciseDescription ? `How it is performed: ${input.exerciseDescription}` : null,
      input.criteria ? `What correct execution looks like: ${input.criteria}` : null,
      input.safetyInstructions ? `Safety notes: ${input.safetyInstructions}` : null,
      input.requiresMovement
        ? 'This exercise REQUIRES visible movement.'
        : 'This is a calm or HOLD exercise (breathing, plank, balance stand): little movement is expected — judge whether the person is present and keeps the described position.',
      `Language for "feedback", "recommendations" and every "issue": ${LANGUAGE_NAME[input.language] ?? LANGUAGE_NAME[AppLanguage.UK]}. Do not use any other language.`,
      `Total frames: ${input.frameCount}. Time windows to judge (return exactly ${input.windows.length} items in "windows", in this order):`,
      windowsText,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.get('AI_MODEL', { infer: true }),
        max_completion_tokens: 900,
        response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              ...input.sheets.flatMap((sheet, i) => [
                {
                  type: 'text',
                  text: `Sheet ${i + 1}: ${sheet.frames.map((f) => `frame ${f.index} = ${f.second}s`).join(', ')}`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${sheet.image.toString('base64')}`,
                    detail: 'high',
                  },
                },
              ]),
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(AI_ANALYSIS.TIMEOUT_MS),
    });

    const body = (await response.json().catch(() => null)) as {
      choices?: { message?: { content?: string; refusal?: string } }[];
      error?: { message?: string };
    } | null;
    if (!response.ok || !body) {
      throw new Error(body?.error?.message ?? `OpenAI HTTP ${response.status}`);
    }

    const message = body.choices?.[0]?.message;
    if (message?.refusal) throw new Error(`OpenAI refused: ${message.refusal}`);
    const raw = message?.content;
    if (!raw) throw new Error('OpenAI response has no message content');

    return parseAnalysisResult(raw, input.frameCount, input.windows, input.language);
  }
}

/** Валідує форму JSON від моделі — нерелевантна/неповна відповідь кидає помилку, а не проходить далі як valid. */
export function parseAnalysisResult(
  raw: string,
  frameCount: number,
  windows: TimeWindow[] = [],
  language: AppLanguage = AppLanguage.UK,
): AiAnalysisResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('OpenAI response is not valid JSON');
  }
  if (typeof parsed !== 'object' || parsed === null)
    throw new Error('OpenAI response is not an object');
  const r = parsed as Record<string, unknown>;
  if (typeof r.personVisibleFrames !== 'number')
    throw new Error('OpenAI response: personVisibleFrames is not a number');
  if (!Array.isArray(r.windows)) throw new Error('OpenAI response: windows is not an array');
  if (typeof r.isCorrect !== 'boolean')
    throw new Error('OpenAI response: isCorrect is not boolean');
  if (typeof r.movementDetected !== 'boolean')
    throw new Error('OpenAI response: movementDetected is not boolean');
  if (typeof r.matchesExercise !== 'boolean')
    throw new Error('OpenAI response: matchesExercise is not boolean');
  if (typeof r.score !== 'number' || Number.isNaN(r.score) || r.score < 0 || r.score > 100) {
    throw new Error('OpenAI response: score is not a number in 0-100');
  }
  if (typeof r.feedback !== 'string' || r.feedback.trim().length === 0) {
    throw new Error('OpenAI response: feedback is empty');
  }
  if (typeof r.recommendations !== 'string' || r.recommendations.trim().length === 0) {
    throw new Error('OpenAI response: recommendations is empty');
  }
  // Відрізки, які модель «забула» оцінити, рахуються як невиконані (сумнів → на користь відмови)
  const judged = windows.map((w, i) => {
    const v = (r.windows as { performed?: unknown; issue?: unknown }[])[i];
    return {
      window: w,
      performed: v?.performed === true,
      issue: typeof v?.issue === 'string' ? v.issue : '',
    };
  });
  return {
    isCorrect: r.isCorrect,
    score: Math.round(r.score),
    feedback: r.feedback,
    recommendations: r.recommendations,
    framesAnalyzed: frameCount,
    personVisibleFrames: Math.max(0, Math.min(frameCount, Math.round(r.personVisibleFrames))),
    windowsPerformed: judged.filter((j) => j.performed).length,
    windowsTotal: judged.length,
    movementDetected: r.movementDetected,
    matchesExercise: r.matchesExercise,
    issues: issuesFromWindows(judged, language),
  };
}

/** Причина за замовчуванням (модель не назвала), мовою виконавця */
const NOT_PERFORMED: Record<AppLanguage, string> = {
  [AppLanguage.UK]: 'Рух вправи не виконувався',
  [AppLanguage.RU]: 'Движение упражнения не выполнялось',
  [AppLanguage.PL]: 'Ruch ćwiczenia nie był wykonywany',
  [AppLanguage.EN]: 'The exercise movement was not performed',
};

/** Невиконані відрізки → проблеми за часом; сусідні відрізки з тією ж причиною склеюються */
export function issuesFromWindows(
  judged: { window: TimeWindow; performed: boolean; issue: string }[],
  language: AppLanguage = AppLanguage.UK,
): AttemptIssue[] {
  const issues: AttemptIssue[] = [];
  let prevBad = false;
  for (const { window, performed, issue } of judged) {
    if (performed) {
      prevBad = false;
      continue;
    }
    const reason = issue.trim() || NOT_PERFORMED[language] || NOT_PERFORMED[AppLanguage.UK];
    const last = issues.at(-1);
    if (prevBad && last && last.reason.toLowerCase() === reason.toLowerCase())
      last.toSec = window.toSec;
    else issues.push({ fromSec: window.fromSec, toSec: window.toSec, reason });
    prevBad = true;
  }
  return issues;
}
