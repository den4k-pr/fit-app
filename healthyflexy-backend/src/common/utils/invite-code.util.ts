import { randomInt } from 'node:crypto';
import { INVITE } from '../constants';

/** 6 символів без 0 O 1 I L (криптостійко) */
export function generateInviteCode(): string {
  const { CODE_ALPHABET, CODE_LENGTH } = INVITE;
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
  ).join('');
}
