import type { Comment, CommentReply } from 'generated/prisma/client';

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
  firstSurname: 'Doe',
  secondSurname: null,
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
    user: {
      id: string;
      name: string;
      firstSurname: string;
      secondSurname: string | null;
      email: string;
      code: string;
    };
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
    user: {
      id: string;
      name: string;
      firstSurname: string;
      secondSurname: string | null;
      email: string;
      code: string;
    };
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
