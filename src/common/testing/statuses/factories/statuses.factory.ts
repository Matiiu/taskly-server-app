import type { Status } from 'generated/prisma/client';

export const buildStatus = (overrides: Partial<Status> = {}): Status => ({
  id: 'status-id-1',
  name: 'Pending',
  color: '#f59e0b',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  workspaceId: 'workspace-id-1',
  ...overrides,
});
