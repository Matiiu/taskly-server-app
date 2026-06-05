import type { PaginationMeta } from '@/common/types/pagination.type';
import { UserType } from '@/users/entities/user.type';

export type PaginatedUsers = {
  users: UserType[];
  meta: PaginationMeta;
};
