import type { Policy } from '@/authorization/types/policy.type';

// Task roles belong to a workspace, so both policies are workspace-scoped on the `workspaceId` argument.
export const TASK_ROLE_POLICIES = {
  // Owner or any member: members need the roles to assign people to tasks
  'taskRole.view': {
    scope: 'workspace',
    owner: 'workspaceOwner',
    anyMember: true,
    arg: 'workspaceId',
  },
  // Owner or members whose workspace role has ROLE_MANAGE
  'taskRole.manage': {
    scope: 'workspace',
    workspace: ['ROLE_MANAGE'],
    owner: 'workspaceOwner',
    arg: 'workspaceId',
  },
} satisfies Record<string, Policy>;
