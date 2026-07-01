import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtPayload as CurrentUserPayload } from '@/auth/types/auth.type';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';
import { buildCategory, buildStatus, buildTask } from '@/common/testing/factories/domain.factory';
import { createTasksServiceMock } from '@/common/testing/mocks/tasks-service.mock';
import { TasksResolver } from '@/tasks/tasks.resolver';
import { TasksService } from '@/tasks/tasks.service';
import { TaskExistsGuard } from '@/tasks/guards/task-exists.guard';
import { UpdateTaskCategoryInput } from '@/tasks/dto/update-task-category.input';
import { UpdateTaskStatusInput } from '@/tasks/dto/update-task-status.input';

describe('TasksResolver', () => {
  let resolver: TasksResolver;
  let tasksServiceMock: ReturnType<typeof createTasksServiceMock>;

  const userPayload: CurrentUserPayload = {
    sub: 'user-id-1',
    code: 'user-code-1',
    jti: 'jti-1',
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    tasksServiceMock = createTasksServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksResolver, { provide: TasksService, useValue: tasksServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TaskExistsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<TasksResolver>(TasksResolver);
  });

  it('createMyTask delegates to service and formats response', async () => {
    const task = buildTask({ title: 'Create tests' });
    const input = { title: 'Create tests', description: 'Resolver coverage' };
    tasksServiceMock.create.mockResolvedValue(task);

    const result = await resolver.createMyTask(userPayload.sub, input);

    expect(tasksServiceMock.create).toHaveBeenCalledWith(userPayload.sub, input);
    expect(result).toEqual({
      message: `Task ${task.title} created successfully`,
      task,
    });
  });

  it('findMyTasks delegates to service', async () => {
    const task = buildTask();
    const pagination = { page: 1, limit: 10, query: 'test' };
    const expected = { tasks: [task], meta: createPaginationMetaMock() };
    tasksServiceMock.findMany.mockResolvedValue(expected);

    const result = await resolver.findMyTasks(userPayload.sub, pagination);

    expect(result).toEqual(expected);
    expect(tasksServiceMock.findMany).toHaveBeenCalledWith(userPayload.sub, pagination);
  });

  it('findMyTask delegates to service', async () => {
    const task = buildTask();
    tasksServiceMock.findOne.mockResolvedValue(task);

    const result = await resolver.findMyTask(userPayload.sub, task.id);

    expect(result).toBe(task);
    expect(tasksServiceMock.findOne).toHaveBeenCalledWith(userPayload.sub, task.id);
  });

  it('updateMyTask updates and fetches task before returning response', async () => {
    const task = buildTask({ title: 'Updated task' });
    const input = {
      title: 'Updated task',
      description: 'updated',
      dueDate: new Date('2024-02-01'),
    };
    tasksServiceMock.update.mockResolvedValue(undefined);
    tasksServiceMock.findOne.mockResolvedValue(task);

    const result = await resolver.updateMyTask(userPayload.sub, task.id, input);

    expect(tasksServiceMock.update).toHaveBeenCalledWith(task.id, userPayload.sub, input);
    expect(tasksServiceMock.findOne).toHaveBeenCalledWith(userPayload.sub, task.id);
    expect(result).toEqual({
      message: `Task ${task.title} updated successfully`,
      task,
    });
  });

  it('updateMyStatus formats message with status name', async () => {
    const task = { ...buildTask(), status: buildStatus({ name: 'Done' }) };
    const input: UpdateTaskStatusInput = { id: 'status-id-2', name: 'Done' };
    tasksServiceMock.updateStatus.mockResolvedValue(task);

    const result = await resolver.updateMyStatus(userPayload.sub, task.id, input);

    expect(tasksServiceMock.updateStatus).toHaveBeenCalledWith(task.id, userPayload.sub, input);
    expect(result).toEqual({
      message: `The status of task ${task.title} updated successfully to ${task.status?.name}`,
      task,
    });
  });

  it('updateMyCategory formats message with category name', async () => {
    const task = { ...buildTask(), category: buildCategory({ name: 'Personal' }) };
    const input: UpdateTaskCategoryInput = { id: 'category-id-2', name: 'Personal' };
    tasksServiceMock.updateCategory.mockResolvedValue(task);

    const result = await resolver.updateMyCategory(userPayload.sub, task.id, input);

    expect(tasksServiceMock.updateCategory).toHaveBeenCalledWith(task.id, userPayload.sub, input);
    expect(result).toEqual({
      message: `The category of task ${task.title} updated successfully to ${task.category?.name}`,
      task,
    });
  });

  it('removeMyTask delegates to service and returns action payload', async () => {
    const task = buildTask({ title: 'Old task' });
    tasksServiceMock.remove.mockResolvedValue(task);

    const result = await resolver.removeMyTask(userPayload.sub, task.id);

    expect(tasksServiceMock.remove).toHaveBeenCalledWith(task.id);
    expect(result).toEqual({
      message: `Task ${task.title} removed successfully`,
      task,
    });
  });

  it('propagates service errors', async () => {
    const boom = new InternalServerErrorException('task create failed');
    tasksServiceMock.create.mockRejectedValue(boom);

    await expect(
      resolver.createMyTask(userPayload.sub, { title: 'x', description: null, dueDate: null }),
    ).rejects.toBe(boom);
  });
});
