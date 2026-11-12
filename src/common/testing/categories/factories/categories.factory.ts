import type { Category } from 'generated/prisma/client';

export const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'category-id-1',
  name: 'Work',
  color: '#3366ff',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  workspaceId: 'workspace-id-1',
  ...overrides,
});
