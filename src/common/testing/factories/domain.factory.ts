import type { Category, Comment, CommentReply, Status, Task } from 'generated/prisma/client';

export const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'category-id-1',
  name: 'Work',
  color: '#3366ff',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  userId: 'user-id-1',
  ...overrides,
});

export const buildStatus = (overrides: Partial<Status> = {}): Status => ({
  id: 'status-id-1',
  name: 'Pending',
  color: '#f59e0b',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  userId: 'user-id-1',
  ...overrides,
});

export const buildTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-id-1',
  title: 'Finish unit tests',
  description: 'Add resolver coverage',
  dueDate: new Date('2024-01-10'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  active: true,
  userId: 'user-id-1',
  categoryId: 'category-id-1',
  statusId: 'status-id-1',
  ...overrides,
});

export const buildComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'comment-id-1',
  content: 'Looks good',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  edited: false,
  active: true,
  taskId: 'task-id-1',
  userId: 'user-id-1',
  ...overrides,
});

export const buildTaskRow = (
  overrides: Partial<{
    id: string;
    userId: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    status: { id: string; name: string; color: string | null } | null;
    category: { id: string; name: string; color: string | null } | null;
  }> = {},
) => ({
  id: 'task-id-1',
  userId: 'user-id-1',
  title: 'Finish unit tests',
  description: 'Add resolver coverage',
  dueDate: new Date('2024-01-10'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  status: { id: 'status-id-1', name: 'Pending', color: '#f59e0b' },
  category: { id: 'category-id-1', name: 'Work', color: '#3366ff' },
  ...overrides,
});

export const buildAssigneeType = (
  overrides: Partial<{
    id: string;
    name: string;
    lastName: string;
    email: string;
    code: string;
  }> = {},
) => ({
  id: 'user-id-2',
  name: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  code: '@janesmith',
  ...overrides,
});

export const buildCommentReply = (overrides: Partial<CommentReply> = {}): CommentReply => ({
  id: 'reply-id-1',
  content: 'Thanks for the update',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  edited: false,
  active: true,
  commentId: 'comment-id-1',
  userId: 'user-id-1',
  ...overrides,
});

const buildCommentAuthor = () => ({
  id: 'user-id-1',
  name: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  code: '@johndoe',
});

export const buildCommentWithUser = (
  overrides: Partial<{
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    edited: boolean;
    active: boolean;
    taskId: string;
    userId: string;
    user: { id: string; name: string; lastName: string; email: string; code: string };
  }> = {},
) => ({
  id: 'comment-id-1',
  content: 'Looks good',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  edited: false,
  active: true,
  taskId: 'task-id-1',
  userId: 'user-id-1',
  user: buildCommentAuthor(),
  ...overrides,
});

export const buildCommentReplyWithUser = (
  overrides: Partial<{
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    edited: boolean;
    active: boolean;
    commentId: string;
    userId: string;
    user: { id: string; name: string; lastName: string; email: string; code: string };
  }> = {},
) => ({
  id: 'reply-id-1',
  content: 'Thanks for the update',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  edited: false,
  active: true,
  commentId: 'comment-id-1',
  userId: 'user-id-1',
  user: buildCommentAuthor(),
  ...overrides,
});
