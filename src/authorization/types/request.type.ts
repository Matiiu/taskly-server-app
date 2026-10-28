import type { Workspace } from 'generated/prisma/client';
import type { AuthenticatedRequest } from '@/login/types/login.type';
import type { TaskWithRelations } from '@/tasks/tasks.repository';

export type AuthorizedRequest = AuthenticatedRequest & {
  /** Set by PolicyGuard for task-scope policies. */
  task?: TaskWithRelations;
  workspace?: Pick<Workspace, 'id' | 'ownerId'>;
};
