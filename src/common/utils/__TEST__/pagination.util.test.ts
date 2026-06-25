import { paginationMeta } from '@/common/utils/pagination.util';

describe('paginationMeta', () => {
  it('calculates total pages and navigation flags', () => {
    const result = paginationMeta(25, 2, 10);

    expect(result).toEqual({
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('returns no next page on the last page', () => {
    const result = paginationMeta(20, 2, 10);

    expect(result.totalPages).toBe(2);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(true);
  });

  it('handles empty collections', () => {
    const result = paginationMeta(0, 1, 10);

    expect(result.totalPages).toBe(0);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPreviousPage).toBe(false);
  });
});
