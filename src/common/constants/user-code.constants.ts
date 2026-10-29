/** User code rules, shared by register, changeCode and the code suggestions. */
export const MIN_CODE_LENGTH = 6;
export const MAX_CODE_LENGTH = 20;
export const CODE_PREFIX = '@';
/** "@" followed by letters, numbers and "_" only. */
export const CODE_PATTERN = /^@[A-Za-z0-9_]+$/;
