import type { Policy } from '@/authorization/types/policy.type';

// Statuses belong to a workspace, so both policies are workspace-scoped on the `workspaceId` argument.
export const STATUS_POLICIES = {
  // Owner or any member: everyone in the workspace needs the statuses to work with tasks
  'status.view': {
    scope: 'workspace',
    owner: 'workspaceOwner',
    anyMember: true,
    arg: 'workspaceId',
  },
  // Owner or members whose workspace role has STATUS_MANAGE
  'status.manage': {
    scope: 'workspace',
    workspace: ['STATUS_MANAGE'],
    owner: 'workspaceOwner',
    arg: 'workspaceId',
  },
} satisfies Record<string, Policy>;
