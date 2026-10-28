import { randomInt } from 'crypto';

import {
  WORKSPACE_CODE_ALPHABET,
  WORKSPACE_CODE_LENGTH,
  WORKSPACE_CODE_PREFIX,
} from '@/workspace/constants/workspace.constants';

/** `WS-` + random uppercase letters and digits, e.g. `WS-7KQ2ZD`. */
export const generateWorkspaceCode = (): string => {
  const chars = Array.from(
    { length: WORKSPACE_CODE_LENGTH },
    () => WORKSPACE_CODE_ALPHABET[randomInt(WORKSPACE_CODE_ALPHABET.length)],
  );

  return `${WORKSPACE_CODE_PREFIX}${chars.join('')}`;
};
