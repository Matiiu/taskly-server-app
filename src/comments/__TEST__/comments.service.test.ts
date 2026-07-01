import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CommentsService } from '@/comments/comments.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { createPrismaMock } from '@/common/testing/mocks/prisma.mock';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import {
  buildCommentWithUser,
  buildCommentReplyWithUser,
} from '@/common/testing/factories/domain.factory';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';

let prisma: ReturnType<typeof createPrismaMock>;
let appEventEmitter: ReturnType<typeof createAppEventEmitterMock>;

describe('CommentsService', () => {
  let service: CommentsService;
  let meta: ReturnType<typeof createPaginationMetaMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    prisma = createPrismaMock();
    appEventEmitter = createAppEventEmitterMock();
    meta = createPaginationMetaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppEventEmitterService, useValue: appEventEmitter },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  describe('findManyByTask', () => {
    it('returns paginated comments for an owned task', async () => {
      const comment = buildCommentWithUser();
      prisma.task.findFirst.mockResolvedValue({ id: 'task-id-1' });
      prisma.comment.count.mockResolvedValue(meta.total);
      prisma.comment.findMany.mockResolvedValue([comment]);

      const result = await service.findManyByTask('user-1', 'task-id-1');

      expect(result.comments).toHaveLength(1);
      expect(result.meta).toEqual(meta);
    });

    it('throws NotFoundException when the task is not found', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.findManyByTask('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findManyRepliesByComment', () => {
    it('returns paginated replies for an owned comment', async () => {
      const reply = buildCommentReplyWithUser();
      prisma.comment.findFirst.mockResolvedValue({ id: 'comment-id-1' });
      prisma.commentReply.count.mockResolvedValue(meta.total);
      prisma.commentReply.findMany.mockResolvedValue([reply]);

      const result = await service.findManyRepliesByComment('user-1', 'comment-id-1');

      expect(result.replies).toHaveLength(1);
      expect(result.meta).toEqual(meta);
    });

    it('throws NotFoundException when comment is not found', async () => {
      prisma.comment.findFirst.mockResolvedValue(null);

      await expect(service.findManyRepliesByComment('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a comment and emits an audit log', async () => {
      const comment = buildCommentWithUser();
      prisma.task.findFirst.mockResolvedValue({ id: 'task-id-1' });
      prisma.comment.create.mockResolvedValue(comment);

      const result = await service.create('user-1', { taskId: 'task-id-1', content: 'Looks good' });

      expect(result.id).toBe(comment.id);
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_COMMENT', entity: 'Comment' }),
      );
    });

    it('throws NotFoundException when the task is not found', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', { taskId: 'missing', content: 'Hi' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when create fails', async () => {
      prisma.task.findFirst.mockResolvedValue({ id: 'task-id-1' });
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.comment.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create('user-1', { taskId: 'task-id-1', content: 'Hi' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when comment is not found', async () => {
      prisma.comment.findFirst.mockResolvedValue(null);

      await expect(service.update('user-1', 'missing', { content: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns existing comment without updating when content is unchanged', async () => {
      const comment = buildCommentWithUser();
      prisma.comment.findFirst.mockResolvedValue(comment);

      const result = await service.update('user-1', comment.id, { content: comment.content });

      expect(result.id).toBe(comment.id);
      expect(prisma.comment.update).not.toHaveBeenCalled();
    });

    it('updates the comment and emits an audit log when content changes', async () => {
      const existing = buildCommentWithUser();
      const updated = buildCommentWithUser({ content: 'Updated', edited: true });
      prisma.comment.findFirst.mockResolvedValue(existing);
      prisma.comment.update.mockResolvedValue(updated);

      const result = await service.update('user-1', existing.id, { content: 'Updated' });

      expect(result.content).toBe('Updated');
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_COMMENT', entity: 'Comment' }),
      );
    });

    it('throws BadRequestException when update fails', async () => {
      const existing = buildCommentWithUser();
      prisma.comment.findFirst.mockResolvedValue(existing);
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.comment.update.mockRejectedValue(new Error('DB error'));

      await expect(service.update('user-1', existing.id, { content: 'Different' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when comment is not found', async () => {
      prisma.comment.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('soft deletes the comment and emits an audit log', async () => {
      const comment = buildCommentWithUser();
      const removed = buildCommentWithUser({ active: false });
      prisma.comment.findFirst.mockResolvedValue(comment);
      prisma.comment.update.mockResolvedValue(removed);

      const result = await service.remove('user-1', comment.id);

      expect(result.active).toBe(false);
      expect(appEventEmitter.emitAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'INACTIVATE_COMMENT', entity: 'Comment' }),
      );
    });

    it('throws BadRequestException when soft delete fails', async () => {
      prisma.comment.findFirst.mockResolvedValue(buildCommentWithUser());
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.comment.update.mockRejectedValue(new Error('DB error'));

      await expect(service.remove('user-1', 'comment-id-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createReply', () => {
    it('creates a reply when the comment is accessible', async () => {
      const reply = buildCommentReplyWithUser();
      prisma.comment.findFirst.mockResolvedValue({ id: 'comment-id-1' });
      prisma.commentReply.create.mockResolvedValue(reply);

      const result = await service.createReply('user-1', {
        commentId: 'comment-id-1',
        content: 'Thanks',
      });

      expect(result.id).toBe(reply.id);
    });

    it('throws NotFoundException when comment is not accessible', async () => {
      prisma.comment.findFirst.mockResolvedValue(null);

      await expect(
        service.createReply('user-1', { commentId: 'missing', content: 'Hi' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when reply create fails', async () => {
      prisma.comment.findFirst.mockResolvedValue({ id: 'comment-id-1' });
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.commentReply.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createReply('user-1', { commentId: 'comment-id-1', content: 'Hi' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateReply', () => {
    it('throws NotFoundException when reply is not found', async () => {
      prisma.commentReply.findFirst.mockResolvedValue(null);

      await expect(service.updateReply('user-1', 'missing', { content: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns existing reply without update when content is unchanged', async () => {
      const reply = buildCommentReplyWithUser();
      prisma.commentReply.findFirst.mockResolvedValue(reply);

      const result = await service.updateReply('user-1', reply.id, { content: reply.content });

      expect(result.id).toBe(reply.id);
      expect(prisma.commentReply.update).not.toHaveBeenCalled();
    });

    it('updates the reply when content changes', async () => {
      const existing = buildCommentReplyWithUser();
      const updated = buildCommentReplyWithUser({ content: 'Updated', edited: true });
      prisma.commentReply.findFirst.mockResolvedValue(existing);
      prisma.commentReply.update.mockResolvedValue(updated);

      const result = await service.updateReply('user-1', existing.id, { content: 'Updated' });

      expect(result.content).toBe('Updated');
    });

    it('throws BadRequestException when reply update fails', async () => {
      const existing = buildCommentReplyWithUser();
      prisma.commentReply.findFirst.mockResolvedValue(existing);
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.commentReply.update.mockRejectedValue(new Error('DB error'));

      await expect(
        service.updateReply('user-1', existing.id, { content: 'Different' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeReply', () => {
    it('throws NotFoundException when reply is not found', async () => {
      prisma.commentReply.findFirst.mockResolvedValue(null);

      await expect(service.removeReply('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('soft deletes the reply', async () => {
      const reply = buildCommentReplyWithUser();
      const removed = buildCommentReplyWithUser({ active: false });
      prisma.commentReply.findFirst.mockResolvedValue(reply);
      prisma.commentReply.update.mockResolvedValue(removed);

      const result = await service.removeReply('user-1', reply.id);

      expect(result.active).toBe(false);
    });

    it('throws BadRequestException when soft delete fails', async () => {
      prisma.commentReply.findFirst.mockResolvedValue(buildCommentReplyWithUser());
      jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);
      prisma.commentReply.update.mockRejectedValue(new Error('DB error'));

      await expect(service.removeReply('user-1', 'reply-id-1')).rejects.toThrow(BadRequestException);
    });
  });
});
