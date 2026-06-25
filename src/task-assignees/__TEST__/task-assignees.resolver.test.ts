import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { buildUser } from '@/common/testing/factories/users.factory';
import { createTaskAssigneesServiceMock } from '@/common/testing/mocks/task-assignees-service.mock';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';
import { TaskAssigneesResolver } from '@/task-assignees/task-assignees.resolver';
import { TaskAssigneesService } from '@/task-assignees/task-assignees.service';

describe('TaskAssigneesResolver', () => {
  let resolver: TaskAssigneesResolver;
  let taskAssigneesServiceMock: ReturnType<typeof createTaskAssigneesServiceMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    taskAssigneesServiceMock = createTaskAssigneesServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskAssigneesResolver,
        { provide: TaskAssigneesService, useValue: taskAssigneesServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<TaskAssigneesResolver>(TaskAssigneesResolver);
  });

  it('addMyTaskAssignee delegates to service and formats response', async () => {
    const assignee = buildUser({ id: 'assignee-id-1', code: '@teammate' });
    const input = { taskId: 'task-id-1', assigneeId: assignee.id };
    taskAssigneesServiceMock.create.mockResolvedValue(assignee);

    const result = await resolver.addMyTaskAssignee('user-id-1', input);

    expect(taskAssigneesServiceMock.create).toHaveBeenCalledWith('user-id-1', input);
    expect(result).toEqual({
      message: `Assignee ${assignee.code} added successfully`,
      assignee,
    });
  });

  it('findMyTaskAssignees delegates to service', async () => {
    const assignee = buildUser({ id: 'assignee-id-1' });
    const pagination = { page: 1, limit: 10 };
    const expected = { assignees: [assignee], meta: createPaginationMetaMock() };
    taskAssigneesServiceMock.findMany.mockResolvedValue(expected);

    const result = await resolver.findMyTaskAssignees('user-id-1', 'task-id-1', pagination);

    expect(result).toEqual(expected);
    expect(taskAssigneesServiceMock.findMany).toHaveBeenCalledWith(
      'user-id-1',
      'task-id-1',
      pagination,
    );
  });

  it('removeMyTaskAssignee delegates to service and formats response', async () => {
    const assignee = buildUser({ id: 'assignee-id-1', code: '@teammate' });
    taskAssigneesServiceMock.remove.mockResolvedValue(assignee);

    const result = await resolver.removeMyTaskAssignee('user-id-1', 'task-id-1', assignee.id);

    expect(taskAssigneesServiceMock.remove).toHaveBeenCalledWith(
      'user-id-1',
      'task-id-1',
      assignee.id,
    );
    expect(result).toEqual({
      message: `Assignee ${assignee.code} removed successfully`,
      assignee,
    });
  });

  it('propagates service errors', async () => {
    const boom = new InternalServerErrorException('assignee add failed');
    taskAssigneesServiceMock.create.mockRejectedValue(boom);

    await expect(
      resolver.addMyTaskAssignee('user-id-1', { taskId: 'task-id-1', assigneeId: 'assignee-id-1' }),
    ).rejects.toBe(boom);
  });
});
