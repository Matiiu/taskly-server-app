import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CommentsResolver } from '@/comments/comments.resolver';
import { CommentsService } from '@/comments/comments.service';
import { buildComment, buildCommentReply } from '@/common/testing/factories/domain.factory';
import { createCommentsServiceMock } from '@/common/testing/mocks/comments-service.mock';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';

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

    const result = await resolver.findMyTaskComments('user-id-1', 'task-id-1', pagination);

    expect(result).toEqual(expected);
    expect(commentsServiceMock.findManyByTask).toHaveBeenCalledWith(
      'user-id-1',
      'task-id-1',
      pagination,
    );
  });

  it('findMyCommentReplies delegates to service', async () => {
    const reply = buildCommentReply();
    const pagination = { page: 2, limit: 3 };
    const expected = { replies: [reply], meta: createPaginationMetaMock({ page: 2, limit: 3 }) };
    commentsServiceMock.findManyRepliesByComment.mockResolvedValue(expected);

    const result = await resolver.findMyCommentReplies('user-id-1', 'comment-id-1', pagination);

    expect(result).toEqual(expected);
    expect(commentsServiceMock.findManyRepliesByComment).toHaveBeenCalledWith(
      'user-id-1',
      'comment-id-1',
      pagination,
    );
  });

  it('createMyTaskComment returns action payload', async () => {
    const comment = buildComment({ content: 'New comment' });
    const input = { taskId: 'task-id-1', content: 'New comment' };
    commentsServiceMock.create.mockResolvedValue(comment);

    const result = await resolver.createMyTaskComment('user-id-1', input);

    expect(result).toEqual({ message: 'Comment created successfully', comment });
    expect(commentsServiceMock.create).toHaveBeenCalledWith('user-id-1', input);
  });

  it('updateMyTaskComment returns action payload', async () => {
    const comment = buildComment({ content: 'Updated content', edited: true });
    const input = { content: 'Updated content' };
    commentsServiceMock.update.mockResolvedValue(comment);

    const result = await resolver.updateMyTaskComment('user-id-1', comment.id, input);

    expect(result).toEqual({ message: 'Comment updated successfully', comment });
    expect(commentsServiceMock.update).toHaveBeenCalledWith('user-id-1', comment.id, input);
  });

  it('removeMyTaskComment returns action payload', async () => {
    const comment = buildComment({ active: false });
    commentsServiceMock.remove.mockResolvedValue(comment);

    const result = await resolver.removeMyTaskComment('user-id-1', comment.id);

    expect(result).toEqual({ message: 'Comment removed successfully', comment });
    expect(commentsServiceMock.remove).toHaveBeenCalledWith('user-id-1', comment.id);
  });

  it('createMyCommentReply returns action payload', async () => {
    const reply = buildCommentReply({ content: 'Thanks' });
    const input = { commentId: 'comment-id-1', content: 'Thanks' };
    commentsServiceMock.createReply.mockResolvedValue(reply);

    const result = await resolver.createMyCommentReply('user-id-1', input);

    expect(result).toEqual({ message: 'Comment reply created successfully', reply });
    expect(commentsServiceMock.createReply).toHaveBeenCalledWith('user-id-1', input);
  });

  it('updateMyCommentReply returns action payload', async () => {
    const reply = buildCommentReply({ content: 'Edited', edited: true });
    const input = { content: 'Edited' };
    commentsServiceMock.updateReply.mockResolvedValue(reply);

    const result = await resolver.updateMyCommentReply('user-id-1', reply.id, input);

    expect(result).toEqual({ message: 'Comment reply updated successfully', reply });
    expect(commentsServiceMock.updateReply).toHaveBeenCalledWith('user-id-1', reply.id, input);
  });

  it('removeMyCommentReply returns action payload', async () => {
    const reply = buildCommentReply({ active: false });
    commentsServiceMock.removeReply.mockResolvedValue(reply);

    const result = await resolver.removeMyCommentReply('user-id-1', reply.id);

    expect(result).toEqual({ message: 'Comment reply removed successfully', reply });
    expect(commentsServiceMock.removeReply).toHaveBeenCalledWith('user-id-1', reply.id);
  });

  it('propagates service errors', async () => {
    const boom = new InternalServerErrorException('comment create failed');
    commentsServiceMock.create.mockRejectedValue(boom);

    await expect(
      resolver.createMyTaskComment('user-id-1', { taskId: 'task-id-1', content: 'Hi' }),
    ).rejects.toBe(boom);
  });
});
