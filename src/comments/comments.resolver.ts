import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CommentsService } from '@/comments/comments.service';
import { CreateCommentInput } from '@/comments/dto/create-comment.input';
import { UpdateCommentInput } from '@/comments/dto/update-comment.input';
import { CreateCommentReplyInput } from '@/comments/dto/create-comment-reply.input';
import { UpdateCommentReplyInput } from '@/comments/dto/update-comment-reply.input';
import { PaginatedCommentType } from '@/comments/entities/paginated-comment.type';
import { PaginatedCommentReplyType } from '@/comments/entities/paginated-comment-reply.type';
import { CommentActionType } from '@/comments/entities/comment-action.type';
import { CommentReplyActionType } from '@/comments/entities/comment-reply-action.type';
import type { Comment, CommentReply, Task, User } from 'generated/prisma/client';

@Resolver()
@UseGuards(JwtAuthGuard)
export class CommentsResolver {
  constructor(private readonly commentsService: CommentsService) {}

  @Query(() => PaginatedCommentType, { name: 'myTaskComments' })
  findMyTaskComments(
    @CurrentUser('sub') userId: User['id'],
    @Args('taskId', { type: () => String }) taskId: Task['id'],
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
  ): Promise<PaginatedCommentType> {
    return this.commentsService.findManyByTask(userId, taskId, { limit, page });
  }

  @Query(() => PaginatedCommentReplyType, { name: 'myCommentReplies' })
  findMyCommentReplies(
    @CurrentUser('sub') userId: User['id'],
    @Args('commentId', { type: () => String }) commentId: Comment['id'],
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
  ): Promise<PaginatedCommentReplyType> {
    return this.commentsService.findManyRepliesByComment(userId, commentId, { limit, page });
  }

  @Mutation(() => CommentActionType, { name: 'createMyTaskComment' })
  async createMyTaskComment(
    @CurrentUser('sub') userId: User['id'],
    @Args('input') input: CreateCommentInput,
  ): Promise<CommentActionType> {
    const comment = await this.commentsService.create(userId, input);

    return {
      message: 'Comment created successfully',
      comment,
    };
  }

  @Mutation(() => CommentActionType, { name: 'updateMyTaskComment' })
  async updateMyTaskComment(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Comment['id'],
    @Args('input') input: UpdateCommentInput,
  ): Promise<CommentActionType> {
    const comment = await this.commentsService.update(userId, id, input);

    return {
      message: 'Comment updated successfully',
      comment,
    };
  }

  @Mutation(() => CommentActionType, { name: 'removeMyTaskComment' })
  async removeMyTaskComment(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: Comment['id'],
  ): Promise<CommentActionType> {
    const comment = await this.commentsService.remove(userId, id);

    return {
      message: 'Comment removed successfully',
      comment,
    };
  }

  @Mutation(() => CommentReplyActionType, { name: 'createMyCommentReply' })
  async createMyCommentReply(
    @CurrentUser('sub') userId: User['id'],
    @Args('input') input: CreateCommentReplyInput,
  ): Promise<CommentReplyActionType> {
    const reply = await this.commentsService.createReply(userId, input);

    return {
      message: 'Comment reply created successfully',
      reply,
    };
  }

  @Mutation(() => CommentReplyActionType, { name: 'updateMyCommentReply' })
  async updateMyCommentReply(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: CommentReply['id'],
    @Args('input') input: UpdateCommentReplyInput,
  ): Promise<CommentReplyActionType> {
    const reply = await this.commentsService.updateReply(userId, id, input);

    return {
      message: 'Comment reply updated successfully',
      reply,
    };
  }

  @Mutation(() => CommentReplyActionType, { name: 'removeMyCommentReply' })
  async removeMyCommentReply(
    @CurrentUser('sub') userId: User['id'],
    @Args('id', { type: () => String }) id: CommentReply['id'],
  ): Promise<CommentReplyActionType> {
    const reply = await this.commentsService.removeReply(userId, id);

    return {
      message: 'Comment reply removed successfully',
      reply,
    };
  }
}
