import { CreateProgramDto } from './create-program.dto';

/**
 * PATCH /programs/:id: редактор завжди надсилає ПОВНИЙ стан чернетки (як `usePlanDraft.toRequest()`),
 * тому форма ідентична створенню — сервер замінює весь набір вправ програми цим списком.
 */
export class UpdateProgramDto extends CreateProgramDto {}
