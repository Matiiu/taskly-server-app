const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Returns a new date `days` after `date` (the input is not modified). */
export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * MS_PER_DAY);
