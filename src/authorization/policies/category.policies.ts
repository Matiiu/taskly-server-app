import type { Policy } from '@/authorization/types/policy.type';

// Categories belong to a workspace, so both policies are workspace-scoped on the `workspaceId` argument.
export const CATEGORY_POLICIES = {
  // Owner or any member: everyone in the workspace needs the categories to work with tasks
  'category.view': {
    scope: 'workspace',
    owner: 'workspaceOwner',
    anyMember: true,
    arg: 'workspaceId',
  },
  // Owner or members whose workspace role has CATEGORY_MANAGE
  'category.manage': {
    scope: 'workspace',
    workspace: ['CATEGORY_MANAGE'],
    owner: 'workspaceOwner',
    arg: 'workspaceId',
  },
} satisfies Record<string, Policy>;
