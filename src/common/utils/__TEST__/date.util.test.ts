import { addDays } from '@/common/utils/date.util';

const BASE_DATE = new Date('2026-01-15T10:00:00.000Z');
const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('addDays', () => {
  it('returns a date the given number of days later', () => {
    expect(addDays(BASE_DATE, 30)).toEqual(new Date('2026-02-14T10:00:00.000Z'));
  });

  it('does not mutate the input date', () => {
    const input = new Date(BASE_DATE.getTime());

    const result = addDays(input, 5);

    expect(input.getTime()).toBe(BASE_DATE.getTime());
    expect(result).not.toBe(input);
  });

  it('returns the same time when adding 0 days', () => {
    const result = addDays(BASE_DATE, 0);

    expect(result.getTime()).toBe(BASE_DATE.getTime());
    expect(result).not.toBe(BASE_DATE);
  });

  it('goes back in time with negative days', () => {
    expect(addDays(BASE_DATE, -2).getTime()).toBe(BASE_DATE.getTime() - 2 * MS_PER_DAY);
  });
});
