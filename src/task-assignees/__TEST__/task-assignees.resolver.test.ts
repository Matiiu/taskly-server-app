import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLField, GraphQLSchema } from 'graphql';

import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { TaskAssigneesResolver } from '@/task-assignees/task-assignees.resolver';
import { TaskAssigneesService } from '@/task-assignees/task-assignees.service';
import { TASK_ASSIGNEE_MESSAGES } from '@/task-assignees/constants/task-assignees-messages.constants';
import { buildResolverSchema } from '@/common/testing/common/factories/gql-schema.factory';
import { createPaginationMetaMock } from '@/common/testing/common/mocks/pagination.mock';
import { buildAssigneeType } from '@/common/testing/task-assignees/factories/task-assignees.factory';
import { createTaskAssigneesServiceMock } from '@/common/testing/task-assignees/mocks/task-assignees-service.mock';

const USER_ID = 'user-id-1';
const TASK_ID = 'task-id-1';

describe('TaskAssigneesResolver', () => {
  let resolver: TaskAssigneesResolver;
  let taskAssigneesServiceMock: ReturnType<typeof createTaskAssigneesServiceMock>;

  beforeEach(async () => {
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

    resolver = module.get(TaskAssigneesResolver);
  });

  it('addMyTaskAssignee returns the message and the added assignee', async () => {
    const assignee = buildAssigneeType();
    const input = { taskId: TASK_ID, assigneeId: assignee.id, roleId: 'task-role-id-1' };
    taskAssigneesServiceMock.create.mockResolvedValue(assignee);

    const result = await resolver.addMyTaskAssignee(USER_ID, input);

    expect(result).toEqual({ message: TASK_ASSIGNEE_MESSAGES.ADDED(assignee.code), assignee });
    expect(taskAssigneesServiceMock.create).toHaveBeenCalledWith(USER_ID, input);
  });

  describe('findMyTaskAssignees', () => {
    it('delegates to the service with the task, pagination and search', async () => {
      const pagination = { page: 2, limit: 5 };
      const expected = { assignees: [buildAssigneeType()], meta: createPaginationMetaMock() };
      taskAssigneesServiceMock.findMany.mockResolvedValue(expected);

      const result = await resolver.findMyTaskAssignees(USER_ID, TASK_ID, pagination, 'jane');

      expect(result).toBe(expected);
      expect(taskAssigneesServiceMock.findMany).toHaveBeenCalledWith(
        USER_ID,
        TASK_ID,
        pagination,
        'jane',
      );
    });

    it('sends a null search by default', async () => {
      await resolver.findMyTaskAssignees(USER_ID, TASK_ID);

      expect(taskAssigneesServiceMock.findMany).toHaveBeenCalledWith(
        USER_ID,
        TASK_ID,
        undefined,
        null,
      );
    });
  });

  it('removeMyTaskAssignee returns the message and the removed assignee', async () => {
    const assignee = buildAssigneeType();
    taskAssigneesServiceMock.remove.mockResolvedValue(assignee);

    const result = await resolver.removeMyTaskAssignee(USER_ID, TASK_ID, assignee.id);

    expect(result).toEqual({ message: TASK_ASSIGNEE_MESSAGES.REMOVED(assignee.code), assignee });
    expect(taskAssigneesServiceMock.remove).toHaveBeenCalledWith(USER_ID, TASK_ID, assignee.id);
  });

  describe('schema', () => {
    let schema: GraphQLSchema;

    beforeAll(async () => {
      schema = await buildResolverSchema([TaskAssigneesResolver]);
    });

    const argsOf = (field: GraphQLField<unknown, unknown>) =>
      Object.fromEntries(field.args.map((arg) => [arg.name, arg.type.toString()]));

    it('exposes the myTaskAssignees query', () => {
      const field = schema.getQueryType()?.getFields()['myTaskAssignees'];

      expect(field).toBeDefined();
      expect(field!.type.toString()).toBe('PaginatedTaskAssigneesType!');
      expect(argsOf(field!)).toEqual({
        taskId: 'String!',
        pagination: 'PaginationArgsInput',
        search: 'String',
      });
    });

    it.each([
      ['addMyTaskAssignee', { input: 'AddTaskAssigneeInput!' }],
      ['removeMyTaskAssignee', { taskId: 'String!', assigneeId: 'String!' }],
    ])('exposes the %s mutation returning TaskAssigneeActionType', (name, args) => {
      const field = schema.getMutationType()?.getFields()[name];

      expect(field).toBeDefined();
      expect(field!.type.toString()).toBe('TaskAssigneeActionType!');
      expect(argsOf(field!)).toEqual(args);
    });
  });
});
