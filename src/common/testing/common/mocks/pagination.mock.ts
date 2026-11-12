import type { PaginationMeta } from '@/common/types/pagination.type';

export const createPaginationMetaMock = (
  overrides: Partial<PaginationMeta> = {},
): PaginationMeta => ({
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  ...overrides,
});
