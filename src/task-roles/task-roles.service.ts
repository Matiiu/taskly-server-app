import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AppEventEmitterService } from '@/common/event-emitter.service';
import { PAGE_DEFAULT, LIMIT_DEFAULT } from '@/common/constants/pagination.constants';
import { paginationMeta } from '@/common/utils/pagination.util';
import { PaginationArgsInput } from '@/common/dto/pagination-args.input';
import type { TaskRoleSnapshot } from '@/common/types/audit-payload.types';
import { isUniqueViolation } from '@/prisma/prisma.errors';
import { TaskRolesRepository } from '@/task-roles/task-roles.repository';
import { CreateTaskRoleInput } from '@/task-roles/dto/create-task-role.input';
import { UpdateTaskRoleInput } from '@/task-roles/dto/update-task-role.input';
import { TaskRoleType } from '@/task-roles/entities/task-role.type';
import { PaginatedTaskRolesType } from '@/task-roles/entities/paginated-task-roles.type';
import type { TaskRole, User, Workspace } from 'generated/prisma/client';
import { DEFAULT_TASK_ROLES } from '@/task-roles/constants/task-role.constants';

@Injectable()
export class TaskRolesService {
  constructor(
    private readonly taskRolesRepo: TaskRolesRepository,
    private readonly eventEmitter: AppEventEmitterService,
  ) {}

  /** Seeds the default task roles of a new workspace. Returns false if it already has roles. */
  async createDefaultTaskRoles(workspaceId: Workspace['id']): Promise<boolean> {
    if (await this.taskRolesRepo.existsInWorkspace(workspaceId)) return false;

    const created = await this.taskRolesRepo.createMany(
      workspaceId,
      DEFAULT_TASK_ROLES.map(({ name, description, permissions }) => ({
        name,
        description,
        permissions: [...permissions],
        isSystem: true,
      })),
    );

    return created === DEFAULT_TASK_ROLES.length;
  }

  async findMany(
    workspaceId: Workspace['id'],
    { limit = LIMIT_DEFAULT, page = PAGE_DEFAULT, sortOrder = 'asc' }: PaginationArgsInput = {},
    search: string | null = null,
  ): Promise<PaginatedTaskRolesType> {
    const { taskRoles, total } = await this.taskRolesRepo.findPage({
      workspaceId,
      page,
      limit,
      sortOrder,
      search,
    });

    return {
      taskRoles: taskRoles.map((taskRole) => this.toTaskRoleType(taskRole)),
      meta: paginationMeta(total, page, limit),
    };
  }

  async findOne(workspaceId: Workspace['id'], id: TaskRole['id']): Promise<TaskRoleType> {
    return this.toTaskRoleType(await this.findInWorkspaceOrThrow(workspaceId, id));
  }

  async create(
    workspaceId: Workspace['id'],
    userId: User['id'],
    { name, description = null, permissions }: CreateTaskRoleInput,
  ): Promise<TaskRoleType> {
    const taskRole = await this.withUniqueName(name, () =>
      this.taskRolesRepo.create({ workspaceId, name, description, permissions }),
    );

    this.eventEmitter.emitAuditLog({
      userId,
      action: 'CREATE_TASK_ROLE',
      entityId: taskRole.id,
      entity: 'TaskRole',
      description: `Task role "${taskRole.name}" was created`,
      after: this.toSnapshot(taskRole),
    });

    return this.toTaskRoleType(taskRole);
  }

  async update(
    workspaceId: Workspace['id'],
    userId: User['id'],
    id: TaskRole['id'],
    input: UpdateTaskRoleInput,
  ): Promise<TaskRoleType> {
    const existingTaskRole = await this.findEditableOrThrow(workspaceId, id);

    const updatedTaskRole = await this.withUniqueName(input.name, () =>
      this.taskRolesRepo.update(id, input),
    );

    this.eventEmitter.emitAuditLog({
      userId,
      action: 'UPDATE_TASK_ROLE',
      entityId: updatedTaskRole.id,
      entity: 'TaskRole',
      description: `Task role "${updatedTaskRole.name}" was updated`,
      before: this.toSnapshot(existingTaskRole),
      after: this.toSnapshot(updatedTaskRole),
    });

    return this.toTaskRoleType(updatedTaskRole);
  }

  async remove(
    workspaceId: Workspace['id'],
    userId: User['id'],
    id: TaskRole['id'],
  ): Promise<TaskRoleType> {
    await this.findEditableOrThrow(workspaceId, id);

    if ((await this.taskRolesRepo.countAssignees(id)) > 0) {
      throw new ConflictException('Task role is assigned to task members and cannot be removed');
    }

    const removedTaskRole = await this.taskRolesRepo.delete(id);

    this.eventEmitter.emitAuditLog({
      userId,
      action: 'DELETE_TASK_ROLE',
      entityId: removedTaskRole.id,
      entity: 'TaskRole',
      description: `Task role "${removedTaskRole.name}" was deleted`,
      before: this.toSnapshot(removedTaskRole),
    });

    return this.toTaskRoleType(removedTaskRole);
  }

  /** 404 when the task role does not exist or belongs to another workspace. */
  async findInWorkspaceOrThrow(
    workspaceId: Workspace['id'],
    id: TaskRole['id'],
  ): Promise<TaskRole> {
    const taskRole = await this.taskRolesRepo.findById(workspaceId, id);

    if (!taskRole) {
      throw new NotFoundException('Task role not found');
    }

    return taskRole;
  }

  toTaskRoleType({
    id,
    name,
    description,
    permissions,
    isSystem,
    createdAt,
    updatedAt,
  }: TaskRole): TaskRoleType {
    return { id, name, description, permissions, isSystem, createdAt, updatedAt };
  }

  /** System roles are seeded with the workspace and cannot be edited or deleted. */
  private async findEditableOrThrow(
    workspaceId: Workspace['id'],
    id: TaskRole['id'],
  ): Promise<TaskRole> {
    const taskRole = await this.findInWorkspaceOrThrow(workspaceId, id);

    if (taskRole.isSystem) {
      throw new BadRequestException('System task roles cannot be modified');
    }

    return taskRole;
  }

  /** Runs a write and maps the (workspaceId, name) unique violation to a 409. */
  private async withUniqueName(
    name: TaskRole['name'] | undefined,
    write: () => Promise<TaskRole>,
  ): Promise<TaskRole> {
    try {
      return await write();
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException(`Task role ${name} already exists`);
      throw e;
    }
  }

  private toSnapshot({ id, name, description, permissions }: TaskRole): TaskRoleSnapshot {
    return { id, name, description, permissions };
  }
}
