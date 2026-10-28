import type { Policy } from '@/authorization/types/policy.type';

// `workspace` / `task` permission lists mean "any of these grants access".
export const TASK_POLICIES = {
  'task.create': {
    scope: 'workspace',
    workspace: ['TASK_CREATE'],
    owner: 'workspaceOwner',
    arg: 'workspaceId',
  },
  'task.view': {
    scope: 'task',
    owner: 'any',
    anyAssignee: true,
    arg: 'id',
  },
  // Creator and workspace owner always; members with workspace TASK_UPDATE; assignees with task TASK_UPDATE
  'task.update': {
    scope: 'task',
    workspace: ['TASK_UPDATE'],
    task: ['TASK_UPDATE'],
    owner: 'any',
    arg: 'id',
  },
  // Same as task.update, plus assignees whose task role only has TASK_CHANGE_STATUS
  'task.changeStatus': {
    scope: 'task',
    workspace: ['TASK_UPDATE'],
    task: ['TASK_CHANGE_STATUS', 'TASK_UPDATE'],
    owner: 'any',
    arg: 'id',
  },
  // Creator and workspace owner always; members with workspace TASK_DELETE.
  // No task-level permission exists for deleting, so being assigned is not enough.
  'task.delete': {
    scope: 'task',
    workspace: ['TASK_DELETE'],
    owner: 'any',
    arg: 'id',
  },
  // ...
} satisfies Record<string, Policy>;

export type TaskAction = keyof typeof TASK_POLICIES;
