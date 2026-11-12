import type { Task } from 'generated/prisma/client';

export const buildTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-id-1',
  title: 'Finish unit tests',
  description: 'Add resolver coverage',
  dueDate: new Date('2024-01-10'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  active: true,
  createdById: 'user-id-1',
  categoryId: 'category-id-1',
  statusId: 'status-id-1',
  sequenceNumber: 1,
  workspaceId: 'workspace-1',
  ...overrides,
});

export const buildTaskRow = (
  overrides: Partial<{
    id: string;
    createdById: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    statusId: string | null;
    categoryId: string | null;
    status: { id: string; name: string; color: string | null } | null;
    category: { id: string; name: string; color: string | null } | null;
  }> = {},
) => ({
  id: 'task-id-1',
  createdById: 'user-id-1',
  title: 'Finish unit tests',
  description: 'Add resolver coverage',
  dueDate: new Date('2024-01-10'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  statusId: overrides.status?.id ?? null,
  categoryId: overrides.category?.id ?? null,
  status: { id: 'status-id-1', name: 'Pending', color: '#f59e0b' },
  category: { id: 'category-id-1', name: 'Work', color: '#3366ff' },
  ...overrides,
});
