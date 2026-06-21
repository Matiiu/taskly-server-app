import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { CreateCommentInput } from '@/comments/dto/create-comment.input';
import { UpdateCommentInput } from '@/comments/dto/update-comment.input';
import { CreateCommentReplyInput } from '@/comments/dto/create-comment-reply.input';
import { UpdateCommentReplyInput } from '@/comments/dto/update-comment-reply.input';
import { CommentType } from '@/comments/entities/comment.type';
import { CommentReplyType } from '@/comments/entities/comment-reply.type';
import { PaginatedCommentType } from '@/comments/entities/paginated-comment.type';
import { PaginatedCommentReplyType } from '@/comments/entities/paginated-comment-reply.type';
import { PAGE_DEFAULT, LIMIT_DEFAULT } from '@/common/constants/pagination.constant';
import { paginationMeta } from '@/common/utils/pagination.util';
import type { Prisma, Comment, CommentReply, Task, User } from 'generated/prisma/client';

const COMMENT_AUTHOR_SELECT = {
  id: true,
  name: true,
  lastName: true,
  email: true,
  code: true,
} satisfies Prisma.UserSelect;

const COMMENT_REPLY_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  edited: true,
  active: true,
  commentId: true,
  userId: true,
  user: {
    select: COMMENT_AUTHOR_SELECT,
  },
} satisfies Prisma.CommentReplySelect;

const COMMENT_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  edited: true,
  active: true,
  taskId: true,
  userId: true,
  user: {
    select: COMMENT_AUTHOR_SELECT,
  },
} satisfies Prisma.CommentSelect;

type CommentWithRelations = Prisma.CommentGetPayload<{
  select: typeof COMMENT_SELECT;
}>;

type CommentReplyWithUser = Prisma.CommentReplyGetPayload<{
  select: typeof COMMENT_REPLY_SELECT;
}>;

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: AppEventEmitterService,
  ) {}

  async findManyByTask(
    userId: User['id'],
    taskId: Task['id'],
    { limit = LIMIT_DEFAULT, page = PAGE_DEFAULT }: { limit?: number; page?: number } = {},
  ): Promise<PaginatedCommentType> {
    await this.findOwnedTaskOrThrow(userId, taskId);

    const where = { taskId, active: true };
    const [total, comments] = await this.prisma.$transaction([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        select: COMMENT_SELECT,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      comments: comments.map((comment) => this.toCommentResponse(comment)),
      meta: paginationMeta(total, page, limit),
    };
  }

  async findManyRepliesByComment(
    userId: User['id'],
    commentId: Comment['id'],
    { limit = LIMIT_DEFAULT, page = PAGE_DEFAULT }: { limit?: number; page?: number } = {},
  ): Promise<PaginatedCommentReplyType> {
    await this.findOwnedCommentOrThrow(userId, commentId);

    const where = { commentId, active: true };
    const [total, replies] = await this.prisma.$transaction([
      this.prisma.commentReply.count({ where }),
      this.prisma.commentReply.findMany({
        where,
        select: COMMENT_REPLY_SELECT,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      replies: replies.map((reply) => this.toReplyResponse(reply)),
      meta: paginationMeta(total, page, limit),
    };
  }

  async create(userId: User['id'], input: CreateCommentInput): Promise<CommentType> {
    // Only task owners can comment on their task. Replies are handled separately and can be done by assignees as well.
    await this.findOwnedTaskOrThrow(userId, input.taskId);

    try {
      const comment = await this.prisma.comment.create({
        data: {
          content: input.content,
          taskId: input.taskId,
          userId,
        },
        select: COMMENT_SELECT,
      });

      this.eventEmitter.emitAuditLog({
        userId,
        action: 'CREATE_COMMENT',
        entityId: comment.id,
        entity: 'Comment',
        description: 'Comment created',
        after: {
          id: comment.id,
          content: comment.content,
          taskId: comment.taskId,
          edited: comment.edited,
          active: comment.active,
        },
      });

      return this.toCommentResponse(comment);
    } catch (e) {
      this.logger.error('Error creating comment', e);
      throw new BadRequestException('Failed to create comment');
    }
  }

  async update(
    userId: User['id'],
    commentId: Comment['id'],
    input: UpdateCommentInput,
  ): Promise<CommentType> {
    const existingComment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        userId,
        active: true,
        task: this.taskAccessWhere(userId),
      },
      select: COMMENT_SELECT,
    });

    if (!existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.content === input.content) {
      return this.toCommentResponse(existingComment);
    }

    try {
      const updatedComment = await this.prisma.comment.update({
        where: { id: commentId },
        data: {
          content: input.content,
          edited: true,
        },
        select: COMMENT_SELECT,
      });

      this.eventEmitter.emitAuditLog({
        userId,
        action: 'UPDATE_COMMENT',
        entityId: updatedComment.id,
        entity: 'Comment',
        description: 'Comment updated',
        before: {
          id: existingComment.id,
          content: existingComment.content,
          taskId: existingComment.taskId,
          edited: existingComment.edited,
          active: existingComment.active,
        },
        after: {
          id: updatedComment.id,
          content: updatedComment.content,
          taskId: updatedComment.taskId,
          edited: updatedComment.edited,
          active: updatedComment.active,
        },
      });

      return this.toCommentResponse(updatedComment);
    } catch (e) {
      this.logger.error('Error updating comment', e);
      throw new BadRequestException('Failed to update comment');
    }
  }

  async remove(userId: User['id'], commentId: Comment['id']): Promise<CommentType> {
    const existingComment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        active: true,
        OR: [{ userId }, { task: { userId, active: true } }],
        task: this.taskAccessWhere(userId),
      },
      select: COMMENT_SELECT,
    });

    if (!existingComment) {
      throw new NotFoundException('Comment not found');
    }

    try {
      const removedComment = await this.prisma.comment.update({
        where: { id: commentId },
        data: {
          // Soft delete: keep history but hide from active queries.
          active: false,
        },
        select: COMMENT_SELECT,
      });

      this.eventEmitter.emitAuditLog({
        userId,
        action: 'INACTIVATE_COMMENT',
        entityId: removedComment.id,
        entity: 'Comment',
        description: 'Comment inactivated',
        before: {
          id: existingComment.id,
          content: existingComment.content,
          taskId: existingComment.taskId,
          edited: existingComment.edited,
          active: existingComment.active,
        },
        after: {
          id: removedComment.id,
          content: removedComment.content,
          taskId: removedComment.taskId,
          edited: removedComment.edited,
          active: removedComment.active,
        },
      });

      return this.toCommentResponse(removedComment);
    } catch (e) {
      this.logger.error('Error removing comment', e);
      throw new BadRequestException('Failed to remove comment');
    }
  }

  async createReply(userId: User['id'], input: CreateCommentReplyInput): Promise<CommentReplyType> {
    const comment = await this.findOwnedCommentOrThrow(userId, input.commentId);

    try {
      const reply = await this.prisma.commentReply.create({
        data: {
          content: input.content,
          commentId: comment.id,
          userId,
        },
        select: COMMENT_REPLY_SELECT,
      });

      return this.toReplyResponse(reply);
    } catch (e) {
      this.logger.error('Error creating comment reply', e);
      throw new BadRequestException('Failed to create comment reply');
    }
  }

  async updateReply(
    userId: User['id'],
    replyId: CommentReply['id'],
    input: UpdateCommentReplyInput,
  ): Promise<CommentReplyType> {
    const existingReply = await this.prisma.commentReply.findFirst({
      where: {
        id: replyId,
        userId,
        active: true,
        comment: {
          active: true,
          task: this.taskAccessWhere(userId),
        },
      },
      select: COMMENT_REPLY_SELECT,
    });

    if (!existingReply) {
      throw new NotFoundException('Comment reply not found');
    }

    if (existingReply.content === input.content) {
      return this.toReplyResponse(existingReply);
    }

    try {
      const updatedReply = await this.prisma.commentReply.update({
        where: { id: replyId },
        data: {
          content: input.content,
          edited: true,
        },
        select: COMMENT_REPLY_SELECT,
      });

      return this.toReplyResponse(updatedReply);
    } catch (e) {
      this.logger.error('Error updating comment reply', e);
      throw new BadRequestException('Failed to update comment reply');
    }
  }

  async removeReply(userId: User['id'], replyId: CommentReply['id']): Promise<CommentReplyType> {
    const existingReply = await this.prisma.commentReply.findFirst({
      where: {
        id: replyId,
        userId,
        active: true,
        comment: {
          active: true,
          task: this.taskAccessWhere(userId),
        },
      },
      select: COMMENT_REPLY_SELECT,
    });

    if (!existingReply) {
      throw new NotFoundException('Comment reply not found');
    }

    try {
      const removedReply = await this.prisma.commentReply.update({
        where: { id: replyId },
        data: {
          active: false,
        },
        select: COMMENT_REPLY_SELECT,
      });

      return this.toReplyResponse(removedReply);
    } catch (e) {
      this.logger.error('Error removing comment reply', e);
      throw new BadRequestException('Failed to remove comment reply');
    }
  }

  private async findOwnedTaskOrThrow(userId: User['id'], taskId: Task['id']): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        ...this.taskAccessWhere(userId),
      },
      select: {
        id: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }
  }

  private async findOwnedCommentOrThrow(
    userId: User['id'],
    commentId: Comment['id'],
  ): Promise<{ id: Comment['id'] }> {
    const comment = await this.prisma.comment.findFirst({
      where: {
        id: commentId,
        active: true,
        task: this.taskAccessWhere(userId),
      },
      select: {
        id: true,
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  private taskAccessWhere(userId: User['id']): Prisma.TaskWhereInput {
    return {
      active: true,
      OR: [{ userId }, { assignees: { some: { userId } } }],
    };
  }

  private toCommentResponse(comment: CommentWithRelations): CommentType {
    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      edited: comment.edited,
      active: comment.active,
      taskId: comment.taskId,
      userId: comment.userId,
      user: comment.user,
    };
  }

  private toReplyResponse(reply: CommentReplyWithUser): CommentReplyType {
    return {
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
      edited: reply.edited,
      active: reply.active,
      commentId: reply.commentId,
      userId: reply.userId,
      user: reply.user,
    };
  }
}
