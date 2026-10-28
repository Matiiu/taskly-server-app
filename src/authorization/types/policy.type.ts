import type { TaskPermission, WorkspacePermission } from 'generated/prisma/client';

export type OwnerRule = 'taskCreator' | 'workspaceOwner' | 'any' | 'none';

export interface Policy {
  scope: 'workspace' | 'task';
  /** Workspace members pass if their workspace role has ANY of these. */
  workspace?: WorkspacePermission[];
  /** Task scope: assignees pass if their task role has ANY of these. */
  task?: TaskPermission[];
  owner: OwnerRule;
  /** Task scope: any assignee passes, whatever their task role (e.g. for viewing). */
  anyAssignee?: boolean;
  /** Workspace scope: any member passes, whatever their workspace role (e.g. for viewing). */
  anyMember?: boolean;
  arg: string;
}
