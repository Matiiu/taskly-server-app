import type { User } from 'generated/prisma/client';
import type { PaginationMeta } from '@/common/types/pagination.type';
import type { AuthenticatedRequest } from '@/login/types/login.type';
import { UserType } from '@/users/entities/user.type';

export type PaginatedUsers = {
  users: UserType[];
  meta: PaginationMeta;
};

/** User without the password hash: the default shape returned by UsersRepository reads. */
export type SafeUser = Omit<User, 'password'>;

/** Request after TargetUserGuard: read the target with @TargetUser(). */
export type TargetUserRequest = AuthenticatedRequest & { targetUser?: SafeUser };
