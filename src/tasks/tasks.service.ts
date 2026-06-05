import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import { AppEventEmitterService } from '@/common/event-emitter.service';
import { CreateTaskInput } from '@/tasks/dto/create-task.input';
import { UpdateTaskStatusInput } from '@/tasks/dto/update-task-status.input';
import { UpdateTaskCategoryInput } from '@/tasks/dto/update-task-category.input';
import { TaskType } from '@/tasks/entities/task.type';
import type { Prisma, User, Task } from 'generated/prisma/client';
import { PAGE_DEFAULT, LIMIT_DEFAULT } from '@/common/constants/pagination.constant';
import { paginationMeta } from '@/common/utils/pagination.util';
import { PaginatedTaskType } from './entities/paginated-task.type';
import { StatusesService } from '@/statuses/statuses.service';
import { CategoriesService } from '@/categories/categories.service';

const DEFAULT_TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  status: { select: { id: true, name: true, color: true } },
  category: { select: { id: true, name: true, color: true } },
  assignees: {
    select: {
      user: {
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          code: true,
        },
      },
    },
  },
} as const;

type TaskWithRelations = Prisma.TaskGetPayload<{
  select: typeof DEFAULT_TASK_SELECT;
}>;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: AppEventEmitterService,
    private readonly statusesService: StatusesService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(userId: User['id'], input: CreateTaskInput): Promise<TaskType> {
    try {
      const task = await this.prisma.task.create({
        select: DEFAULT_TASK_SELECT,
        data: {
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
          userId,
        },
      });

      this.eventEmitter.emitAuditLog({
        userId,
        action: 'CREATE_TASK',
        entityId: task.id,
        entity: 'Task',
        description: `Task "${task.title}" has been created`,
        after: {
          id: task.id,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          status: null,
          category: null,
        },
      });

      return this.toTaskResponse(task);
    } catch (e) {
      this.logger.error('Error creating task', e);
      throw new BadRequestException('Failed to create task');
    }
  }

  async findMany(
    userId: User['id'],
    {
      limit = LIMIT_DEFAULT,
      page = PAGE_DEFAULT,
      title,
    }: { limit?: number; page?: number; title?: string } = {},
  ): Promise<PaginatedTaskType> {
    const where = {
      active: true,
      userId,
      ...(title && { title: { contains: title, mode: 'insensitive' as const } }),
    };
    const [total, tasks] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where,
        select: DEFAULT_TASK_SELECT,
        orderBy: [{ createdAt: 'desc' }],
      }),
    ]);
    return {
      tasks: tasks.map((task) => this.toTaskResponse(task)),
      meta: paginationMeta(total, page, limit),
    };
  }

  async findOne(userId: User['id'], id: Task['id']): Promise<TaskType> {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        userId,
        active: true,
      },
      select: DEFAULT_TASK_SELECT,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.toTaskResponse(task);
  }

  async update(
    id: Task['id'],
    userId: User['id'],
    input: Partial<CreateTaskInput>,
  ): Promise<TaskType> {
    const existingTask = await this.prisma.task.findUniqueOrThrow({
      where: { id },
      select: { userId: true, ...DEFAULT_TASK_SELECT },
    });

    try {
      const updatedTask = await this.prisma.task.update({
        where: { id },
        select: DEFAULT_TASK_SELECT,
        data: {
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
        },
      });

      this.eventEmitter.emitAuditLog({
        userId: existingTask.userId,
        action: 'UPDATE_TASK',
        entityId: existingTask.id,
        entity: 'Task',
        description: `Task "${existingTask.title}" has been updated`,
        before: {
          id: existingTask.id,
          title: existingTask.title,
          description: existingTask.description,
          dueDate: existingTask.dueDate,
          status: existingTask.status,
          category: existingTask.category,
        },
        after: {
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          dueDate: updatedTask.dueDate,
          status: updatedTask.status,
          category: updatedTask.category,
        },
      });

      return this.toTaskResponse(updatedTask);
    } catch (e) {
      this.logger.error('Error updating task', e);
      throw new BadRequestException('Failed to update task');
    }
  }

  async updateStatus(
    id: Task['id'],
    userId: User['id'],
    input: UpdateTaskStatusInput,
  ): Promise<TaskType> {
    const userTask = await this.prisma.task.findUniqueOrThrow({
      where: { id },
      select: { userId: true, statusId: true, ...DEFAULT_TASK_SELECT },
    });

    const status = await this.statusesService.findByIdOrNameOrCreate(userId, input);

    if (userTask.statusId === status.id) return this.toTaskResponse(userTask);

    try {
      const updatedTask = await this.prisma.task.update({
        where: { id },
        select: DEFAULT_TASK_SELECT,
        data: { statusId: status.id },
      });

      this.eventEmitter.emitAuditLog({
        userId: userTask.userId,
        action: 'UPDATE_TASK',
        entityId: userTask.id,
        entity: 'Task',
        description: `Status from "${userTask.status?.name ?? 'None'}" to "${status.name}"`,
        before: {
          id: userTask.id,
          title: userTask.title,
          description: userTask.description,
          dueDate: userTask.dueDate,
          status: userTask.status,
          category: userTask.category,
        },
        after: {
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          dueDate: updatedTask.dueDate,
          status: updatedTask.status,
          category: updatedTask.category,
        },
      });

      return this.toTaskResponse(updatedTask);
    } catch (e) {
      this.logger.error('Error updating task status', e);
      throw new BadRequestException('Failed to update task status');
    }
  }

  async updateCategory(
    id: Task['id'],
    userId: User['id'],
    input: UpdateTaskCategoryInput,
  ): Promise<TaskType> {
    const userTask = await this.prisma.task.findUniqueOrThrow({
      where: { id },
      select: { userId: true, categoryId: true, ...DEFAULT_TASK_SELECT },
    });

    const category = await this.categoriesService.findByIdOrNameOrCreate(userId, input);

    if (userTask.categoryId === category.id) return this.toTaskResponse(userTask);

    try {
      const updatedTask = await this.prisma.task.update({
        where: { id },
        select: DEFAULT_TASK_SELECT,
        data: { categoryId: category.id },
      });

      this.eventEmitter.emitAuditLog({
        userId: userTask.userId,
        action: 'UPDATE_TASK',
        entityId: userTask.id,
        entity: 'Task',
        description: `Category from "${userTask.category?.name ?? 'None'}" to "${category.name}"`,
        before: {
          id: userTask.id,
          title: userTask.title,
          description: userTask.description,
          dueDate: userTask.dueDate,
          status: userTask.status,
          category: userTask.category,
        },
        after: {
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          dueDate: updatedTask.dueDate,
          status: updatedTask.status,
          category: updatedTask.category,
        },
      });

      return this.toTaskResponse(updatedTask);
    } catch (e) {
      this.logger.error('Error updating task category', e);
      throw new BadRequestException('Failed to update task category');
    }
  }

  async remove(id: Task['id']): Promise<TaskType> {
    const userTask = await this.prisma.task.findUniqueOrThrow({
      where: {
        id,
      },
      select: { userId: true, ...DEFAULT_TASK_SELECT },
    });

    try {
      const removedTask = await this.prisma.task.update({
        where: { id },
        select: DEFAULT_TASK_SELECT,
        data: { active: false },
      });

      this.eventEmitter.emitAuditLog({
        userId: userTask.userId,
        action: 'INACTIVATE_TASK',
        entityId: userTask.id,
        entity: 'Task',
        description: `Task "${userTask.title}" has been inactivated`,
        before: {
          id: userTask.id,
          title: userTask.title,
          description: userTask.description,
          dueDate: userTask.dueDate,
          status: userTask.status,
          category: userTask.category,
        },
        after: {
          id: removedTask.id,
          title: removedTask.title,
          description: removedTask.description,
          dueDate: removedTask.dueDate,
          status: removedTask.status,
          category: removedTask.category,
        },
      });

      return this.toTaskResponse(removedTask);
    } catch (e) {
      this.logger.error('Error removing task', e);
      throw new BadRequestException('Failed to remove task');
    }
  }

  private toTaskResponse(task: TaskWithRelations): TaskType {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      status: task.status,
      category: task.category,
      taskAssignees: task.assignees.map(({ user }) => user),
    };
  }
}
