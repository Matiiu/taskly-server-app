import type { WorkspaceRole } from 'generated/prisma/client';

/**
 * Seeded in every new workspace as system roles (they can't be edited or deleted).
 * Viewing needs no permission: any member can view through the `anyMember` policy rule.
 */
export const DEFAULT_WORKSPACE_ROLES = [
  {
    name: 'Admin',
    description: 'Full control of the workspace, its members, roles and tasks',
    permissions: [
      'WORKSPACE_UPDATE',
      'MEMBER_INVITE',
      'MEMBER_REMOVE',
      'ROLE_MANAGE',
      'STATUS_MANAGE',
      'CATEGORY_MANAGE',
      'TASK_CREATE',
      'TASK_UPDATE',
      'TASK_DELETE',
      'TASK_ASSIGN',
      'COMMENT_CREATE',
      'COMMENT_DELETE_ANY',
    ],
  },
  {
    name: 'Member',
    description: 'Create, edit and assign tasks, and comment',
    permissions: ['TASK_CREATE', 'TASK_UPDATE', 'TASK_ASSIGN', 'COMMENT_CREATE'],
  },
  {
    name: 'Viewer',
    description: 'View the workspace and its tasks',
    permissions: [],
  },
] as const satisfies readonly Pick<WorkspaceRole, 'name' | 'description' | 'permissions'>[];
