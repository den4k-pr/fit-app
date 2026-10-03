import { AppLanguage } from '../../common/enums';
import { PushEventType, PushMessage, PushTemplateContext } from './notifications.types';

export type PushTemplate = (ctx: PushTemplateContext) => Pick<PushMessage, 'title' | 'body'>;
export type PushTemplateMap = Record<PushEventType, PushTemplate>;

const who = (ctx: PushTemplateContext) => ctx.actorName ?? ctx.relationshipLabel;
const amount = (ctx: PushTemplateContext) => ctx.amountLabel ?? '';

/** Дієслово «виконав/виконала» за родом; для нейтрального — безособова форма (ТЗ §9) */
const doneVerb = {
  [AppLanguage.UK]: { f: 'виконала', m: 'виконав' },
  [AppLanguage.PL]: { f: 'wykonała', m: 'wykonał' },
  [AppLanguage.EN]: { f: 'completed', m: 'completed' },
  [AppLanguage.RU]: { f: 'выполнила', m: 'выполнил' },
} as const;

/** Шаблони push мовами uk/pl/en/ru. Мова — ОДЕРЖУВАЧА. */
export const PUSH_TEMPLATES: Record<AppLanguage, PushTemplateMap> = {
  [AppLanguage.UK]: {
    [PushEventType.PARENT_DAY_COMPLETED]: (c) => ({
      title: 'Вправи виконано ✅',
      body:
        c.gender === 'n'
          ? `Сьогоднішні вправи виконано: ${who(c)} ✅`
          : `${who(c)} ${doneVerb.uk[c.gender]} сьогоднішні вправи ✅`,
    }),
    [PushEventType.REMINDER_FROM_CHILD]: (c) => ({
      title: 'Час для вправ!',
      body: `${who(c)} чекає 💚`,
    }),
    [PushEventType.SETTLEMENT_CREATED]: (c) => ({
      title: 'Новий переказ',
      body: `${who(c)} · переказ ${amount(c)}. Підтвердьте отримання`,
    }),
    [PushEventType.SETTLEMENT_CONFIRMED]: (c) => ({
      title: 'Переказ підтверджено ✅',
      body: `${amount(c)}: отримання підтверджено`,
    }),
    [PushEventType.SETTLEMENT_REJECTED]: (c) => ({
      title: 'Переказ не підтверджено',
      body: `${amount(c)}: отримання не підтверджено. Перевірте переказ`,
    }),
  },
  [AppLanguage.PL]: {
    [PushEventType.PARENT_DAY_COMPLETED]: (c) => ({
      title: 'Ćwiczenia wykonane ✅',
      body:
        c.gender === 'n'
          ? `Dzisiejsze ćwiczenia wykonane: ${who(c)} ✅`
          : `${who(c)} ${doneVerb.pl[c.gender]} dzisiejsze ćwiczenia ✅`,
    }),
    [PushEventType.REMINDER_FROM_CHILD]: (c) => ({
      title: 'Czas na ćwiczenia!',
      body: `${who(c)} czeka 💚`,
    }),
    [PushEventType.SETTLEMENT_CREATED]: (c) => ({
      title: 'Nowy przelew',
      body: `${who(c)} · przelew ${amount(c)}. Potwierdź odbiór`,
    }),
    [PushEventType.SETTLEMENT_CONFIRMED]: (c) => ({
      title: 'Przelew potwierdzony ✅',
      body: `${amount(c)}: odbiór potwierdzony`,
    }),
    [PushEventType.SETTLEMENT_REJECTED]: (c) => ({
      title: 'Przelew niepotwierdzony',
      body: `${amount(c)}: odbiór niepotwierdzony. Sprawdź przelew`,
    }),
  },
  [AppLanguage.EN]: {
    [PushEventType.PARENT_DAY_COMPLETED]: (c) => ({
      title: 'Exercises done ✅',
      body: `${who(c)} ${doneVerb.en[c.gender === 'n' ? 'f' : c.gender]} today's exercises ✅`,
    }),
    [PushEventType.REMINDER_FROM_CHILD]: (c) => ({
      title: 'Time to exercise!',
      body: `${who(c)} is waiting 💚`,
    }),
    [PushEventType.SETTLEMENT_CREATED]: (c) => ({
      title: 'New transfer',
      body: `${who(c)} · transfer ${amount(c)}. Please confirm receipt`,
    }),
    [PushEventType.SETTLEMENT_CONFIRMED]: (c) => ({
      title: 'Transfer confirmed ✅',
      body: `${amount(c)}: receipt confirmed`,
    }),
    [PushEventType.SETTLEMENT_REJECTED]: (c) => ({
      title: 'Transfer not confirmed',
      body: `${amount(c)}: receipt not confirmed. Please check the transfer`,
    }),
  },
  [AppLanguage.RU]: {
    [PushEventType.PARENT_DAY_COMPLETED]: (c) => ({
      title: 'Упражнения выполнены ✅',
      body:
        c.gender === 'n'
          ? `Сегодняшние упражнения выполнены: ${who(c)} ✅`
          : `${who(c)} ${doneVerb.ru[c.gender]} сегодняшние упражнения ✅`,
    }),
    [PushEventType.REMINDER_FROM_CHILD]: (c) => ({
      title: 'Время для упражнений!',
      body: `${who(c)} ждет 💚`,
    }),
    [PushEventType.SETTLEMENT_CREATED]: (c) => ({
      title: 'Новый перевод',
      body: `${who(c)} · перевод ${amount(c)}. Подтвердите получение`,
    }),
    [PushEventType.SETTLEMENT_CONFIRMED]: (c) => ({
      title: 'Перевод подтвержден ✅',
      body: `${amount(c)}: получение подтверждено`,
    }),
    [PushEventType.SETTLEMENT_REJECTED]: (c) => ({
      title: 'Перевод не подтвержден',
      body: `${amount(c)}: получение не подтверждено. Проверьте перевод`,
    }),
  },
};
