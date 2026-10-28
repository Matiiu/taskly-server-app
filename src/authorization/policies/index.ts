import type { Policy } from '@/authorization/types/policy.type';
import { TASK_POLICIES } from '@/authorization/policies/task.policies';
import { STATUS_POLICIES } from '@/authorization/policies/status.policies';
import { CATEGORY_POLICIES } from '@/authorization/policies/category.policies';

/** Every policy @Can() accepts. Add each feature's policy map here. */
export const POLICIES = {
  ...TASK_POLICIES,
  ...STATUS_POLICIES,
  ...CATEGORY_POLICIES,
} satisfies Record<string, Policy>;

export type PolicyAction = keyof typeof POLICIES;
