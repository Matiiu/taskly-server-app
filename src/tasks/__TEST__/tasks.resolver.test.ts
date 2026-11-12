import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLField, GraphQLSchema } from 'graphql';

import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { PolicyGuard } from '@/authorization/guards/policy.guard';
import { TasksResolver } from '@/tasks/tasks.resolver';
import { TasksService } from '@/tasks/tasks.service';
import { TASK_MESSAGES } from '@/tasks/constants/tasks-messages.constants';
import type { TaskDetailType } from '@/tasks/entities/task-detail.type';
import type { TaskWithRelations } from '@/tasks/tasks.repository';
import { TaskRelation } from '@/tasks/enums/task-relation.enums';
import { buildResolverSchema } from '@/common/testing/common/factories/gql-schema.factory';
import { createPaginationMetaMock } from '@/common/testing/common/mocks/pagination.mock';
import { createTasksServiceMock } from '@/common/testing/tasks/mocks/tasks-service.mock';

const USER_ID = 'user-id-1';
const WORKSPACE_ID = 'workspace-id-1';
const TASK_ID = 'task-id-1';

const buildTaskDetail = (overrides: Partial<TaskDetailType> = {}): TaskDetailType => ({
  id: TASK_ID,
  title: 'Finish unit tests',
  code: 'TSK-1',
  description: null,
  dueDate: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  status: { id: 'status-id-1', name: 'Done', color: '#22c55e' },
  category: { id: 'category-id-1', name: 'Work', color: '#3366ff' },
  relations: [TaskRelation.CREATED],
  ...overrides,
});

// The policy guard loads this row; the resolver only hands it to the service.
const existingTask = { id: TASK_ID } as TaskWithRelations;

describe('TasksResolver', () => {
  let resolver: TasksResolver;
  let tasksServiceMock: ReturnType<typeof createTasksServiceMock>;

  beforeEach(async () => {
    tasksServiceMock = createTasksServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksResolver, { provide: TasksService, useValue: tasksServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PolicyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get(TasksResolver);
  });

  it('create returns the message and the created task', async () => {
    const task = buildTaskDetail();
    const input = { title: task.title, description: null, dueDate: null };
    tasksServiceMock.create.mockResolvedValue(task);

    const result = await resolver.create(USER_ID, WORKSPACE_ID, input);

    expect(result).toEqual({ message: TASK_MESSAGES.CREATED(task), task });
    expect(tasksServiceMock.create).toHaveBeenCalledWith(USER_ID, WORKSPACE_ID, input);
  });

  describe('findMany', () => {
    it('delegates to the service with the pagination and filters', async () => {
      const pagination = { page: 2, limit: 5 };
      const filters = { search: 'tests' };
      const expected = { tasks: [], meta: createPaginationMetaMock() };
      tasksServiceMock.findMany.mockResolvedValue(expected);

      const result = await resolver.findMany(USER_ID, pagination, filters);

      expect(result).toBe(expected);
      expect(tasksServiceMock.findMany).toHaveBeenCalledWith(USER_ID, pagination, filters);
    });

    it('uses empty pagination and filters by default', async () => {
      await resolver.findMany(USER_ID);

      expect(tasksServiceMock.findMany).toHaveBeenCalledWith(USER_ID, {}, {});
    });
  });

  it('findOne maps the task loaded by the guard', () => {
    const detail = buildTaskDetail();
    tasksServiceMock.toDetail.mockReturnValue(detail);

    expect(resolver.findOne(USER_ID, TASK_ID, existingTask)).toBe(detail);
    expect(tasksServiceMock.toDetail).toHaveBeenCalledWith(existingTask, USER_ID);
  });

  it('update returns the message and the updated task', async () => {
    const task = buildTaskDetail({ title: 'Renamed' });
    const input = { title: 'Renamed', description: null, dueDate: null };
    tasksServiceMock.update.mockResolvedValue(task);

    const result = await resolver.update(USER_ID, TASK_ID, input, existingTask);

    expect(result).toEqual({ message: TASK_MESSAGES.UPDATED(task), task });
    expect(tasksServiceMock.update).toHaveBeenCalledWith(existingTask, USER_ID, input);
  });

  it('updateStatus returns the message with the new status and the task', async () => {
    const task = buildTaskDetail();
    const input = { name: 'Done' };
    tasksServiceMock.updateStatus.mockResolvedValue(task);

    const result = await resolver.updateStatus(USER_ID, TASK_ID, input, existingTask);

    expect(result).toEqual({ message: TASK_MESSAGES.STATUS_UPDATED(task), task });
    expect(result.message).toContain('to Done');
    expect(tasksServiceMock.updateStatus).toHaveBeenCalledWith(existingTask, USER_ID, input);
  });

  it('updateCategory returns the message with the new category and the task', async () => {
    const task = buildTaskDetail();
    const input = { name: 'Work' };
    tasksServiceMock.updateCategory.mockResolvedValue(task);

    const result = await resolver.updateCategory(USER_ID, TASK_ID, input, existingTask);

    expect(result).toEqual({ message: TASK_MESSAGES.CATEGORY_UPDATED(task), task });
    expect(result.message).toContain('to Work');
    expect(tasksServiceMock.updateCategory).toHaveBeenCalledWith(existingTask, USER_ID, input);
  });

  it('remove returns the message and the removed task', async () => {
    const task = buildTaskDetail();
    tasksServiceMock.remove.mockResolvedValue(task);

    const result = await resolver.remove(USER_ID, TASK_ID, existingTask);

    expect(result).toEqual({ message: TASK_MESSAGES.REMOVED(task), task });
    expect(tasksServiceMock.remove).toHaveBeenCalledWith(existingTask, USER_ID);
  });

  describe('schema', () => {
    let schema: GraphQLSchema;

    beforeAll(async () => {
      schema = await buildResolverSchema([TasksResolver]);
    });

    const argsOf = (field: GraphQLField<unknown, unknown>) =>
      Object.fromEntries(field.args.map((arg) => [arg.name, arg.type.toString()]));

    it.each([
      [
        'tasks',
        'PaginatedTaskSummaryType!',
        { pagination: 'PaginationArgsInput', filters: 'TasksFiltersInput' },
      ],
      ['task', 'TaskDetailType!', { id: 'ID!' }],
    ])('exposes the %s query returning %s', (name, returnType, args) => {
      const field = schema.getQueryType()?.getFields()[name];

      expect(field).toBeDefined();
      expect(field!.type.toString()).toBe(returnType);
      expect(argsOf(field!)).toEqual(args);
    });

    it.each([
      ['createTask', 'CreateTaskPayload!', { workspaceId: 'ID!', input: 'CreateTaskInput!' }],
      ['updateTask', 'UpdateTaskPayload!', { id: 'ID!', input: 'CreateTaskInput!' }],
      [
        'updateTaskStatus',
        'UpdateTaskStatusPayload!',
        { id: 'ID!', input: 'UpdateTaskStatusInput!' },
      ],
      [
        'updateTaskCategory',
        'UpdateTaskCategoryPayload!',
        { id: 'ID!', input: 'UpdateTaskCategoryInput!' },
      ],
      ['removeTask', 'RemoveTaskPayload!', { id: 'ID!' }],
    ])('exposes the %s mutation returning %s', (name, returnType, args) => {
      const field = schema.getMutationType()?.getFields()[name];

      expect(field).toBeDefined();
      expect(field!.type.toString()).toBe(returnType);
      expect(argsOf(field!)).toEqual(args);
    });

    it('mutation payloads return the message and the task', () => {
      const payload = schema.getType('UpdateTaskStatusPayload');
      const fields = (payload as unknown as { getFields(): Record<string, unknown> }).getFields();

      expect(Object.keys(fields)).toEqual(expect.arrayContaining(['message', 'task']));
    });
  });
});
