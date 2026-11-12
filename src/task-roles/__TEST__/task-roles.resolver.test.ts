import { Test, TestingModule } from '@nestjs/testing';
import { GraphQLField, GraphQLSchema } from 'graphql';

import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { PolicyGuard } from '@/authorization/guards/policy.guard';
import { TaskRolesResolver } from '@/task-roles/task-roles.resolver';
import { TaskRolesService } from '@/task-roles/task-roles.service';
import { TASK_ROLE_MESSAGES } from '@/task-roles/constants/task-roles-messages.constants';
import { buildResolverSchema } from '@/common/testing/common/factories/gql-schema.factory';
import { createPaginationMetaMock } from '@/common/testing/common/mocks/pagination.mock';
import { buildTaskRole } from '@/common/testing/task-roles/factories/task-roles.factory';
import { createTaskRolesServiceMock } from '@/common/testing/task-roles/mocks/task-roles-service.mock';

const WORKSPACE_ID = 'workspace-id-1';
const USER_ID = 'user-id-1';

describe('TaskRolesResolver', () => {
  let resolver: TaskRolesResolver;
  let taskRolesServiceMock: ReturnType<typeof createTaskRolesServiceMock>;

  beforeEach(async () => {
    taskRolesServiceMock = createTaskRolesServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskRolesResolver, { provide: TaskRolesService, useValue: taskRolesServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PolicyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get(TaskRolesResolver);
  });

  describe('findMany', () => {
    it('delegates to the service with the workspace, pagination and search', async () => {
      const pagination = { page: 2, limit: 5 };
      const expected = { taskRoles: [buildTaskRole()], meta: createPaginationMetaMock() };
      taskRolesServiceMock.findMany.mockResolvedValue(expected);

      const result = await resolver.findMany(WORKSPACE_ID, pagination, 'rev');

      expect(result).toBe(expected);
      expect(taskRolesServiceMock.findMany).toHaveBeenCalledWith(WORKSPACE_ID, pagination, 'rev');
    });

    it('sends a null search by default', async () => {
      await resolver.findMany(WORKSPACE_ID);

      expect(taskRolesServiceMock.findMany).toHaveBeenCalledWith(WORKSPACE_ID, undefined, null);
    });
  });

  it('findOne delegates to the service', async () => {
    const taskRole = buildTaskRole();
    taskRolesServiceMock.findOne.mockResolvedValue(taskRole);

    await expect(resolver.findOne(WORKSPACE_ID, taskRole.id)).resolves.toBe(taskRole);
    expect(taskRolesServiceMock.findOne).toHaveBeenCalledWith(WORKSPACE_ID, taskRole.id);
  });

  it('create returns the message and the created task role', async () => {
    const taskRole = buildTaskRole();
    const input = { name: taskRole.name, permissions: taskRole.permissions };
    taskRolesServiceMock.create.mockResolvedValue(taskRole);

    const result = await resolver.create(USER_ID, WORKSPACE_ID, input);

    expect(result).toEqual({ message: TASK_ROLE_MESSAGES.CREATED(taskRole.name), taskRole });
    expect(taskRolesServiceMock.create).toHaveBeenCalledWith(WORKSPACE_ID, USER_ID, input);
  });

  it('update returns the message and the updated task role', async () => {
    const taskRole = buildTaskRole({ name: 'Lead' });
    const input = { name: 'Lead' };
    taskRolesServiceMock.update.mockResolvedValue(taskRole);

    const result = await resolver.update(USER_ID, WORKSPACE_ID, taskRole.id, input);

    expect(result).toEqual({ message: TASK_ROLE_MESSAGES.UPDATED(taskRole.name), taskRole });
    expect(taskRolesServiceMock.update).toHaveBeenCalledWith(
      WORKSPACE_ID,
      USER_ID,
      taskRole.id,
      input,
    );
  });

  it('remove returns the message and the removed task role', async () => {
    const taskRole = buildTaskRole();
    taskRolesServiceMock.remove.mockResolvedValue(taskRole);

    const result = await resolver.remove(USER_ID, WORKSPACE_ID, taskRole.id);

    expect(result).toEqual({ message: TASK_ROLE_MESSAGES.REMOVED(taskRole.name), taskRole });
    expect(taskRolesServiceMock.remove).toHaveBeenCalledWith(WORKSPACE_ID, USER_ID, taskRole.id);
  });

  describe('schema', () => {
    let schema: GraphQLSchema;

    beforeAll(async () => {
      schema = await buildResolverSchema([TaskRolesResolver]);
    });

    const argsOf = (field: GraphQLField<unknown, unknown>) =>
      Object.fromEntries(field.args.map((arg) => [arg.name, arg.type.toString()]));

    it.each([
      [
        'taskRoles',
        'PaginatedTaskRolesType!',
        { workspaceId: 'ID!', pagination: 'PaginationArgsInput', search: 'String' },
      ],
      ['taskRole', 'TaskRoleType!', { workspaceId: 'ID!', id: 'ID!' }],
    ])('exposes the %s query returning %s', (name, returnType, args) => {
      const field = schema.getQueryType()?.getFields()[name];

      expect(field).toBeDefined();
      expect(field!.type.toString()).toBe(returnType);
      expect(argsOf(field!)).toEqual(args);
    });

    it.each([
      [
        'createTaskRole',
        'CreateTaskRolePayload!',
        { workspaceId: 'ID!', input: 'CreateTaskRoleInput!' },
      ],
      [
        'updateTaskRole',
        'UpdateTaskRolePayload!',
        { workspaceId: 'ID!', id: 'ID!', input: 'UpdateTaskRoleInput!' },
      ],
      ['removeTaskRole', 'RemoveTaskRolePayload!', { workspaceId: 'ID!', id: 'ID!' }],
    ])('exposes the %s mutation returning %s', (name, returnType, args) => {
      const field = schema.getMutationType()?.getFields()[name];

      expect(field).toBeDefined();
      expect(field!.type.toString()).toBe(returnType);
      expect(argsOf(field!)).toEqual(args);
    });

    it('mutation payloads return the message and the task role', () => {
      const payload = schema.getType('CreateTaskRolePayload');
      const fields = (payload as unknown as { getFields(): Record<string, unknown> }).getFields();

      expect(Object.keys(fields)).toEqual(expect.arrayContaining(['message', 'taskRole']));
    });
  });
});
