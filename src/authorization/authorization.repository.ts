import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import type { Db } from '@/prisma/prisma.types';
import { DEFAULT_TASK_SELECT, type TaskWithRelations } from '@/tasks/tasks.repository';
import type {
  Prisma,
  Task,
  TaskPermission,
  User,
  Workspace,
  WorkspacePermission,
} from 'generated/prisma/client';

type WorkspacePermissionsCheck = {
  workspaceId: Workspace['id'];
  userId: User['id'];
  /** A member passes if their workspace role has ANY of these. */
  permissions: WorkspacePermission[];
  allowWorkspaceOwner: boolean;
  /** Any member passes, regardless of `permissions`. */
  allowAnyMember: boolean;
};

type TaskPermissionsCheck = {
  taskId: Task['id'];
  userId: User['id'];
  /** An assignee passes if their task role has ANY of these. */
  taskPermissions: TaskPermission[];
  /** A workspace member (assigned or not) passes if their workspace role has ANY of these. */
  workspacePermissions: WorkspacePermission[];
  allowTaskCreator: boolean;
  allowWorkspaceOwner: boolean;
  /** Any assignee passes, regardless of `taskPermissions`. */
  allowAnyAssignee: boolean;
};

@Injectable()
export class AuthorizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * True when the workspace is active and the user is its owner (if allowed),
   * any member (if allowed), or a member whose role has any of `permissions`.
   */
  async hasWorkspacePermissions(
    {
      workspaceId,
      userId,
      permissions,
      allowWorkspaceOwner,
      allowAnyMember,
    }: WorkspacePermissionsCheck,
    db: Db = this.prisma,
  ): Promise<boolean> {
    const access: Prisma.WorkspaceWhereInput[] = [];

    if (allowWorkspaceOwner) access.push({ ownerId: userId });
    // Any member already covers members with the right role, so the role check is only needed otherwise
    if (allowAnyMember) {
      access.push({ members: { some: { userId } } });
    } else if (permissions.length > 0) {
      access.push({
        members: { some: { userId, role: { permissions: { hasSome: permissions } } } },
      });
    }

    if (access.length === 0) return false;

    const workspace = await db.workspace.findFirst({
      where: { id: workspaceId, active: true, OR: access },
      select: { id: true },
    });

    return workspace !== null;
  }

  /**
   * Loads the task when it and its workspace are active and the user is the task creator,
   * the workspace owner (each if allowed), an assignee whose task role has any of `taskPermissions`,
   * or a workspace member whose workspace role has any of `workspacePermissions`.
   * Returns null when the user may not act on it, so the check and the load are one query.
   */
  async findAuthorizedTask(
    {
      taskId,
      userId,
      taskPermissions,
      workspacePermissions,
      allowTaskCreator,
      allowWorkspaceOwner,
      allowAnyAssignee,
    }: TaskPermissionsCheck,
    db: Db = this.prisma,
  ): Promise<TaskWithRelations | null> {
    const access: Prisma.TaskWhereInput[] = [];

    if (allowTaskCreator) access.push({ createdById: userId });
    if (allowWorkspaceOwner) access.push({ workspace: { ownerId: userId } });
    // Any assignee already covers assignees with the right role, so the role check is only needed otherwise
    if (allowAnyAssignee) {
      access.push({ assignees: { some: { userId } } });
    } else if (taskPermissions.length > 0) {
      access.push({
        assignees: { some: { userId, role: { permissions: { hasSome: taskPermissions } } } },
      });
    }
    // Workspace-wide permission: applies to every task in the workspace, assigned or not
    if (workspacePermissions.length > 0) {
      access.push({
        workspace: {
          members: {
            some: { userId, role: { permissions: { hasSome: workspacePermissions } } },
          },
        },
      });
    }

    if (access.length === 0) return null;

    return db.task.findFirst({
      where: { id: taskId, active: true, workspace: { active: true }, OR: access },
      select: DEFAULT_TASK_SELECT,
    });
  }
}
