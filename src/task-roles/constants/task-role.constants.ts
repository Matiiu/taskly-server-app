import type { TaskRole } from 'generated/prisma/client';

export const TASK_ROLE_NAME_MAX_LENGTH = 50;
export const TASK_ROLE_DESCRIPTION_MAX_LENGTH = 255;

/** Seeded in every new workspace as system roles (they can't be edited or deleted). */
export const DEFAULT_TASK_ROLES = [
  {
    name: 'Manager',
    description:
      'Full control of the task: edit, change status, assign people and moderate comments',
    permissions: [
      'TASK_UPDATE',
      'TASK_CHANGE_STATUS',
      'TASK_ASSIGN',
      'COMMENT_CREATE',
      'COMMENT_DELETE_ANY',
    ],
  },
  {
    name: 'Editor',
    description: 'Edit the task, change its status and comment',
    permissions: ['TASK_UPDATE', 'TASK_CHANGE_STATUS', 'COMMENT_CREATE'],
  },
  {
    name: 'Contributor',
    description: 'Change the task status and comment',
    permissions: ['TASK_CHANGE_STATUS', 'COMMENT_CREATE'],
  },
  {
    name: 'Commenter',
    description: 'Comment on the task',
    permissions: ['COMMENT_CREATE'],
  },
] as const satisfies readonly Pick<TaskRole, 'name' | 'description' | 'permissions'>[];
