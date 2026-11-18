const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;

/** Returns a new date `minutes` after `date` (the input is not modified). */
export const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * MS_PER_MINUTE);

/** Returns a new date `days` after `date` (the input is not modified). */
export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MS_PER_DAY);
