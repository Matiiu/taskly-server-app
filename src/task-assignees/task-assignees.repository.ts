import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import type { Db } from '@/prisma/prisma.types';
import type { Prisma, Task, TaskAssignee, User } from 'generated/prisma/client';
import { SortOrder } from '@/common/enums/pagination.enum';

const ASSIGNEE_USER_SELECT = {
  id: true,
  name: true,
  firstSurname: true,
  secondSurname: true,
  email: true,
  code: true,
} satisfies Prisma.UserSelect;

const OWNED_TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  dueDate: true,
  workspaceId: true,
  status: { select: { id: true, name: true, color: true } },
  category: { select: { id: true, name: true, color: true } },
} satisfies Prisma.TaskSelect;

const ASSIGNMENT_SELECT = {
  user: { select: ASSIGNEE_USER_SELECT },
  role: { select: { id: true, name: true } },
} satisfies Prisma.TaskAssigneeSelect;

export type OwnedTask = Prisma.TaskGetPayload<{ select: typeof OWNED_TASK_SELECT }>;
export type AssigneeUser = Prisma.UserGetPayload<{ select: typeof ASSIGNEE_USER_SELECT }>;
export type Assignment = Prisma.TaskAssigneeGetPayload<{ select: typeof ASSIGNMENT_SELECT }>;

export type CreateTaskAssigneeData = Pick<
  TaskAssignee,
  'taskId' | 'userId' | 'roleId' | 'assignedById'
>;

type FindPageData = {
  taskId: Task['id'];
  page: number;
  limit: number;
  sortOrder: SortOrder;
  search: string | null;
};

/** Every assignee query is scoped to a task. */
@Injectable()
export class TaskAssigneesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwnedTask(
    userId: User['id'],
    taskId: Task['id'],
    db: Db = this.prisma,
  ): Promise<OwnedTask | null> {
    return db.task.findFirst({
      where: { id: taskId, createdById: userId, active: true },
      select: OWNED_TASK_SELECT,
    });
  }

  findByTaskAndUser(
    taskId: Task['id'],
    userId: User['id'],
    db: Db = this.prisma,
  ): Promise<Assignment | null> {
    return db.taskAssignee.findUnique({
      where: { taskId_userId: { taskId, userId } },
      select: ASSIGNMENT_SELECT,
    });
  }

  /**
   * Active assignees only, searched by name, surnames, email or code.
   * Not `db`-aware: the batch `$transaction([...])` form is not available on a transaction client.
   */
  async findPage({
    taskId,
    page,
    limit,
    sortOrder,
    search,
  }: FindPageData): Promise<{ assignees: AssigneeUser[]; total: number }> {
    const term = search?.trim();
    const contains = { contains: term, mode: 'insensitive' } as const;

    const where: Prisma.TaskAssigneeWhereInput = {
      taskId,
      user: {
        active: true,
        ...(term && {
          OR: [
            { name: contains },
            { firstSurname: contains },
            { secondSurname: contains },
            { email: contains },
            { code: contains },
          ],
        }),
      },
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.taskAssignee.findMany({
        where,
        select: { user: { select: ASSIGNEE_USER_SELECT } },
        orderBy: [
          { user: { name: sortOrder } },
          { user: { firstSurname: sortOrder } },
          { user: { secondSurname: sortOrder } },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.taskAssignee.count({ where }),
    ]);

    return { assignees: rows.map(({ user }) => user), total };
  }

  create(data: CreateTaskAssigneeData, db: Db = this.prisma): Promise<TaskAssignee> {
    return db.taskAssignee.create({ data });
  }

  delete(taskId: Task['id'], userId: User['id'], db: Db = this.prisma): Promise<TaskAssignee> {
    return db.taskAssignee.delete({ where: { taskId_userId: { taskId, userId } } });
  }
}
