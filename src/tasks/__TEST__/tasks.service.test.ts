import { Test, TestingModule } from '@nestjs/testing';

import { TasksService } from '@/tasks/tasks.service';
import { TasksRepository } from '@/tasks/tasks.repository';
import { TaskRelation } from '@/tasks/enums/task-relation.enums';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { StatusesService } from '@/statuses/statuses.service';
import { CategoriesService } from '@/categories/categories.service';
import { createAppEventEmitterMock } from '@/common/testing/mocks/app-event-emitter.mock';
import { LIMIT_DEFAULT, PAGE_DEFAULT } from '@/common/constants/pagination.constants';

const USER_ID = 'user-id-1';

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepo: { findPage: jest.Mock };

  beforeEach(async () => {
    tasksRepo = { findPage: jest.fn().mockResolvedValue({ tasks: [], total: 0 }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TasksRepository, useValue: tasksRepo },
        { provide: AppEventEmitterService, useValue: createAppEventEmitterMock() },
        { provide: StatusesService, useValue: {} },
        { provide: CategoriesService, useValue: {} },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  describe('findMany', () => {
    it('calls the repository with defaults and no active flag', async () => {
      const result = await service.findMany(USER_ID);

      expect(tasksRepo.findPage).toHaveBeenCalledWith({
        userId: USER_ID,
        page: PAGE_DEFAULT,
        limit: LIMIT_DEFAULT,
        sortOrder: 'desc',
        search: null,
        relations: undefined,
      });
      expect(result.tasks).toEqual([]);
      expect(result.meta).toMatchObject({ total: 0, page: PAGE_DEFAULT, limit: LIMIT_DEFAULT });
    });

    it('passes explicit pagination and filters to the repository', async () => {
      await service.findMany(
        USER_ID,
        { page: 2, limit: 5, sortOrder: 'asc' },
        { search: 'report', relations: [TaskRelation.CREATED] },
      );

      expect(tasksRepo.findPage).toHaveBeenCalledWith({
        userId: USER_ID,
        page: 2,
        limit: 5,
        sortOrder: 'asc',
        search: 'report',
        relations: [TaskRelation.CREATED],
      });
    });
  });
});
