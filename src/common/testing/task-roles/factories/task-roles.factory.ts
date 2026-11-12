import type { TaskRole } from 'generated/prisma/client';

export const buildTaskRole = (overrides: Partial<TaskRole> = {}): TaskRole => ({
  id: 'task-role-id-1',
  name: 'Reviewer',
  description: 'Reviews the task',
  permissions: ['COMMENT_CREATE'],
  isSystem: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  workspaceId: 'workspace-id-1',
  ...overrides,
});
