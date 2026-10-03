import { InitSchema1789812970940 } from './migrations/1789812970940-InitSchema';
import { PhotosInsteadOfVideo1789900000000 } from './migrations/1789900000000-PhotosInsteadOfVideo';
import { EmailAuth1789950000000 } from './migrations/1789950000000-EmailAuth';
import { ProgramsAndAiAttempts1790000000000 } from './migrations/1790000000000-ProgramsAndAiAttempts';
import { CascadeProgramAssignmentDeletion1790100000000 } from './migrations/1790100000000-CascadeProgramAssignmentDeletion';
import { AddRussianLanguage1790200000000 } from './migrations/1790200000000-AddRussianLanguage';
import { ProgramHighlights1790300000000 } from './migrations/1790300000000-ProgramHighlights';
import { StepsAndMoreFrames1790400000000 } from './migrations/1790400000000-StepsAndMoreFrames';
import { MockupParity1790500000000 } from './migrations/1790500000000-MockupParity';
import { TwelveFramesAndIssues1790600000000 } from './migrations/1790600000000-TwelveFramesAndIssues';
import { StoryboardFrames1790700000000 } from './migrations/1790700000000-StoryboardFrames';
import { AdminCrm1790800000000 } from './migrations/1790800000000-AdminCrm';
import { ExerciseVariety1790900000000 } from './migrations/1790900000000-ExerciseVariety';
import { ForeignKeyIndexes1791000000000 } from './migrations/1791000000000-ForeignKeyIndexes';
import { SponsorExercisesFundAi1791100000000 } from './migrations/1791100000000-SponsorExercisesFundAi';
import { EmailVerification1791200000000 } from './migrations/1791200000000-EmailVerification';
import { Payments1791300000000 } from './migrations/1791300000000-Payments';

/**
 * Явний список міграцій: використовується лише в тестах, де глоб `*.ts` не працює (vitest не компілює файли для require).
 * У dev/prod міграції підхоплюються глобом. Тест `перевірка списку міграцій` ловить забуту нову міграцію.
 */
export const ALL_MIGRATIONS = [
  InitSchema1789812970940,
  PhotosInsteadOfVideo1789900000000,
  EmailAuth1789950000000,
  ProgramsAndAiAttempts1790000000000,
  CascadeProgramAssignmentDeletion1790100000000,
  AddRussianLanguage1790200000000,
  ProgramHighlights1790300000000,
  StepsAndMoreFrames1790400000000,
  MockupParity1790500000000,
  TwelveFramesAndIssues1790600000000,
  StoryboardFrames1790700000000,
  AdminCrm1790800000000,
  ExerciseVariety1790900000000,
  ForeignKeyIndexes1791000000000,
  SponsorExercisesFundAi1791100000000,
  EmailVerification1791200000000,
  Payments1791300000000,
];
