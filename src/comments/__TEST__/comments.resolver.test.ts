import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLField, GraphQLSchema } from 'graphql';

import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { CommentsResolver } from '@/comments/comments.resolver';
import { CommentsService } from '@/comments/comments.service';
import { COMMENT_MESSAGES } from '@/comments/constants/comments-messages.constants';
import {
  buildComment,
  buildCommentReply,
} from '@/common/testing/comments/factories/comments.factory';
import { createCommentsServiceMock } from '@/common/testing/comments/mocks/comments-service.mock';
import { buildResolverSchema } from '@/common/testing/common/factories/gql-schema.factory';
import { createPaginationMetaMock } from '@/common/testing/common/mocks/pagination.mock';

const USER_ID = 'user-id-1';
const TASK_ID = 'task-id-1';
const COMMENT_ID = 'comment-id-1';

describe('CommentsResolver', () => {
  let resolver: CommentsResolver;
  let commentsServiceMock: ReturnType<typeof createCommentsServiceMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    commentsServiceMock = createCommentsServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CommentsResolver, { provide: CommentsService, useValue: commentsServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<CommentsResolver>(CommentsResolver);
  });

  it('findMyTaskComments delegates to service', async () => {
    const comment = buildComment();
    const pagination = { page: 1, limit: 5 };
    const expected = { comments: [comment], meta: createPaginationMetaMock({ limit: 5 }) };
    commentsServiceMock.findManyByTask.mockResolvedValue(expected);

    const result = await resolver.findMyTaskComments(USER_ID, TASK_ID, pagination);

    expect(result).toEqual(expected);
    expect(commentsServiceMock.findManyByTask).toHaveBeenCalledWith(USER_ID, TASK_ID, pagination);
  });

  it('findMyCommentReplies delegates to service', async () => {
    const reply = buildCommentReply();
    const pagination = { page: 2, limit: 3 };
    const expected = { replies: [reply], meta: createPaginationMetaMock({ page: 2, limit: 3 }) };
    commentsServiceMock.findManyRepliesByComment.mockResolvedValue(expected);

    const result = await resolver.findMyCommentReplies(USER_ID, COMMENT_ID, pagination);

    expect(result).toEqual(expected);
    expect(commentsServiceMock.findManyRepliesByComment).toHaveBeenCalledWith(
      USER_ID,
      COMMENT_ID,
      pagination,
    );
  });

  it('createMyTaskComment returns action payload', async () => {
    const comment = buildComment({ content: 'New comment' });
    const input = { taskId: TASK_ID, content: 'New comment' };
    commentsServiceMock.create.mockResolvedValue(comment);

    const result = await resolver.createMyTaskComment(USER_ID, input);

    expect(result).toEqual({ message: COMMENT_MESSAGES.CREATED, comment });
    expect(commentsServiceMock.create).toHaveBeenCalledWith(USER_ID, input);
  });

  it('updateMyTaskComment returns action payload', async () => {
    const comment = buildComment({ content: 'Updated content', edited: true });
    const input = { content: 'Updated content' };
    commentsServiceMock.update.mockResolvedValue(comment);

    const result = await resolver.updateMyTaskComment(USER_ID, comment.id, input);

    expect(result).toEqual({ message: COMMENT_MESSAGES.UPDATED, comment });
    expect(commentsServiceMock.update).toHaveBeenCalledWith(USER_ID, comment.id, input);
  });

  it('removeMyTaskComment returns action payload', async () => {
    const comment = buildComment({ active: false });
    commentsServiceMock.remove.mockResolvedValue(comment);

    const result = await resolver.removeMyTaskComment(USER_ID, comment.id);

    expect(result).toEqual({ message: COMMENT_MESSAGES.REMOVED, comment });
    expect(commentsServiceMock.remove).toHaveBeenCalledWith(USER_ID, comment.id);
  });

  it('createMyCommentReply returns action payload', async () => {
    const reply = buildCommentReply({ content: 'Thanks' });
    const input = { commentId: COMMENT_ID, content: 'Thanks' };
    commentsServiceMock.createReply.mockResolvedValue(reply);

    const result = await resolver.createMyCommentReply(USER_ID, input);

    expect(result).toEqual({ message: COMMENT_MESSAGES.REPLY_CREATED, reply });
    expect(commentsServiceMock.createReply).toHaveBeenCalledWith(USER_ID, input);
  });

  it('updateMyCommentReply returns action payload', async () => {
    const reply = buildCommentReply({ content: 'Edited', edited: true });
    const input = { content: 'Edited' };
    commentsServiceMock.updateReply.mockResolvedValue(reply);

    const result = await resolver.updateMyCommentReply(USER_ID, reply.id, input);

    expect(result).toEqual({ message: COMMENT_MESSAGES.REPLY_UPDATED, reply });
    expect(commentsServiceMock.updateReply).toHaveBeenCalledWith(USER_ID, reply.id, input);
  });

  it('removeMyCommentReply returns action payload', async () => {
    const reply = buildCommentReply({ active: false });
    commentsServiceMock.removeReply.mockResolvedValue(reply);

    const result = await resolver.removeMyCommentReply(USER_ID, reply.id);

    expect(result).toEqual({ message: COMMENT_MESSAGES.REPLY_REMOVED, reply });
    expect(commentsServiceMock.removeReply).toHaveBeenCalledWith(USER_ID, reply.id);
  });

  it('propagates service errors', async () => {
    const boom = new InternalServerErrorException('comment create failed');
    commentsServiceMock.create.mockRejectedValue(boom);

    await expect(
      resolver.createMyTaskComment(USER_ID, { taskId: TASK_ID, content: 'Hi' }),
    ).rejects.toBe(boom);
  });

  describe('schema', () => {
    let schema: GraphQLSchema;

    beforeAll(async () => {
      schema = await buildResolverSchema([CommentsResolver]);
    });

    const argsOf = (field: GraphQLField<unknown, unknown>) =>
      Object.fromEntries(field.args.map((arg) => [arg.name, arg.type.toString()]));

    it.each([
      [
        'myTaskComments',
        'PaginatedCommentType!',
        { taskId: 'String!', pagination: 'PaginationArgsInput' },
      ],
      [
        'myCommentReplies',
        'PaginatedCommentReplyType!',
        { commentId: 'String!', pagination: 'PaginationArgsInput' },
      ],
    ])('exposes the %s query returning %s', (name, returnType, args) => {
      const field = schema.getQueryType()?.getFields()[name];

      expect(field).toBeDefined();
      expect(field!.type.toString()).toBe(returnType);
      expect(argsOf(field!)).toEqual(args);
    });

    it.each([
      ['createMyTaskComment', 'CommentActionType!', { input: 'CreateCommentInput!' }],
      [
        'updateMyTaskComment',
        'CommentActionType!',
        { id: 'String!', input: 'UpdateCommentInput!' },
      ],
      ['removeMyTaskComment', 'CommentActionType!', { id: 'String!' }],
      ['createMyCommentReply', 'CommentReplyActionType!', { input: 'CreateCommentReplyInput!' }],
      [
        'updateMyCommentReply',
        'CommentReplyActionType!',
        { id: 'String!', input: 'UpdateCommentReplyInput!' },
      ],
      ['removeMyCommentReply', 'CommentReplyActionType!', { id: 'String!' }],
    ])('exposes the %s mutation returning %s', (name, returnType, args) => {
      const field = schema.getMutationType()?.getFields()[name];

      expect(field).toBeDefined();
      expect(field!.type.toString()).toBe(returnType);
      expect(argsOf(field!)).toEqual(args);
    });
  });
});
