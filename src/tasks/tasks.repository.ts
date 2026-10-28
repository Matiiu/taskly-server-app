import { Injectable } from '@nestjs/common';
import type { Task, Prisma, User } from 'generated/prisma/client';
import type { Db } from '@/prisma/prisma.types';
import { PrismaService } from '@/prisma/prisma.service';
import { SortOrder } from '@/common/enums/pagination.enum';
import { TaskRelation } from '@/tasks/enums/task-relation.enums';

export type CreateTaskData = Pick<
  Task,
  | 'title'
  | 'description'
  | 'dueDate'
  | 'sequenceNumber'
  | 'workspaceId'
  | 'createdById'
  | 'statusId'
>;

/** Fields left undefined are not changed (Prisma skips undefined in `data`). */
export type UpdateTaskData = Partial<
  Pick<Task, 'title' | 'description' | 'dueDate' | 'statusId' | 'categoryId'>
>;

type FindPageForUserData = {
  userId: User['id'];
  active?: boolean;
  page: number;
  limit: number;
  sortOrder: SortOrder;
  search: string | null;
  /** How the user relates to the task. Omitted or empty → every relation. */
  relations?: TaskRelation[];
};

// Record over TaskRelation: adding a relation to the enum fails to compile until it is handled here
const RELATION_WHERE: Record<TaskRelation, (userId: User['id']) => Prisma.TaskWhereInput> = {
  [TaskRelation.CREATED]: (userId) => ({ createdById: userId }),
  [TaskRelation.ASSIGNED]: (userId) => ({ assignees: { some: { userId } } }),
};

// Task codes are `${workspace.taskPrefix}-${sequenceNumber}`: matches "TSK-12", "tsk12", "TSK 12" or just "12"
const TASK_CODE_PATTERN = /^([a-z]+)?[\s-]?(\d+)$/i;
const MAX_SEQUENCE_NUMBER = 2_147_483_647; // Postgres INTEGER; larger values make Prisma throw

/**
 * Matches the title, or the task code when the term looks like one.
 * The code is not a column, so it is split into prefix + sequence number and matched on those.
 */
const searchWhere = (search: string): Prisma.TaskWhereInput => {
  const term = search.trim();
  const conditions: Prisma.TaskWhereInput[] = [{ title: { contains: term, mode: 'insensitive' } }];
  const match = TASK_CODE_PATTERN.exec(term);

  if (match) {
    const [, prefix, sequence] = match;
    const sequenceNumber = Number(sequence);

    if (sequenceNumber <= MAX_SEQUENCE_NUMBER) {
      conditions.push({
        sequenceNumber,
        ...(prefix && { workspace: { taskPrefix: { equals: prefix, mode: 'insensitive' } } }),
      });
    }
  }

  return { OR: conditions };
};

type FindOneForUserData = {
  id: Task['id'];
  userId: User['id'];
  active?: boolean;
};

export const DEFAULT_TASK_SELECT = {
  id: true,
  workspaceId: true,
  createdById: true,
  title: true,
  description: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  sequenceNumber: true,
  workspace: { select: { taskPrefix: true } },
  // A single task's assignee ids: cheap, and keeps this select independent of the current user
  assignees: { select: { userId: true } },
  status: { select: { id: true, name: true, color: true } },
  category: { select: { id: true, name: true, color: true } },
} satisfies Prisma.TaskSelect;

export type TaskWithRelations = Prisma.TaskGetPayload<{
  select: typeof DEFAULT_TASK_SELECT;
}>;

// Only what TaskListItemType needs; sequenceNumber + taskPrefix build the task code
// createdById + the user's own assignment (0 or 1 row) tell how the user relates to each task
const taskListSelect = (userId: User['id']) =>
  ({
    id: true,
    title: true,
    dueDate: true,
    sequenceNumber: true,
    createdById: true,
    assignees: { where: { userId }, select: { userId: true } },
    workspace: { select: { taskPrefix: true } },
    status: { select: { id: true, name: true, color: true } },
    category: { select: { id: true, name: true, color: true } },
  }) satisfies Prisma.TaskSelect;

export type TaskListRow = Prisma.TaskGetPayload<{
  select: ReturnType<typeof taskListSelect>;
}>;

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTaskData, db: Db = this.prisma): Promise<TaskWithRelations> {
    return await db.task.create({
      select: DEFAULT_TASK_SELECT,
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        createdById: data.createdById,
        sequenceNumber: data.sequenceNumber,
        workspaceId: data.workspaceId,
        statusId: data.statusId,
      },
    });
  }

  update(id: Task['id'], data: UpdateTaskData, db: Db = this.prisma): Promise<TaskWithRelations> {
    return db.task.update({
      where: { id },
      select: DEFAULT_TASK_SELECT,
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        statusId: data.statusId,
        categoryId: data.categoryId,
      },
    });
  }

  /** Soft delete: the task is kept but marked inactive. */
  deactivate(id: Task['id'], db: Db = this.prisma): Promise<TaskWithRelations> {
    return db.task.update({
      where: { id },
      select: DEFAULT_TASK_SELECT,
      data: { active: false },
    });
  }

  async findPageForUser(
    { userId, active, page, limit, sortOrder, search, relations }: FindPageForUserData,
    db: Db = this.prisma,
  ): Promise<{ tasks: TaskListRow[]; total: number }> {
    const selectedRelations = relations?.length ? relations : Object.values(TaskRelation);
    // Relations and search each need their own OR, so they are combined with AND
    const where: Prisma.TaskWhereInput = {
      ...(active !== undefined && { active }),
      AND: [
        { OR: selectedRelations.map((relation) => RELATION_WHERE[relation](userId)) },
        ...(search?.trim() ? [searchWhere(search)] : []),
      ],
    };

    const [total, tasks] = await db.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where,
        select: taskListSelect(userId),
        orderBy: [{ createdAt: sortOrder }],
      }),
    ]);

    return { tasks, total };
  }

  findOne(
    { id, userId, active }: FindOneForUserData,
    db: Db = this.prisma,
  ): Promise<TaskWithRelations | null> {
    return db.task.findFirst({
      where: {
        id,
        ...(active && { active }),
        OR: [{ createdById: userId }, { assignees: { some: { userId } } }],
      },
      select: DEFAULT_TASK_SELECT,
    });
  }
}
