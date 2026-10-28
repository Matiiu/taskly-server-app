import { ForbiddenException, Injectable } from '@nestjs/common';

import { AuthorizationRepository } from '@/authorization/authorization.repository';
import { POLICIES, type PolicyAction } from '@/authorization/policies';
import type { OwnerRule, Policy } from '@/authorization/types/policy.type';
import type { TaskWithRelations } from '@/tasks/tasks.repository';
import type { User } from 'generated/prisma/client';

@Injectable()
export class AuthorizationService {
  constructor(private readonly authorizationRepo: AuthorizationRepository) {}

  getPolicy(action: PolicyAction): Policy {
    return POLICIES[action];
  }

  /**
   * Throws ForbiddenException unless the user may perform `action` on the resource.
   * `resourceId` is a workspace id or a task id, depending on the policy scope.
   * Task-scope policies return the authorized task so callers do not load it again;
   * workspace-scope policies return null.
   */
  async authorize(
    action: PolicyAction,
    userId: User['id'],
    resourceId: string,
  ): Promise<TaskWithRelations | null> {
    const policy = this.getPolicy(action);

    if (policy.scope === 'workspace') {
      const allowed = await this.authorizationRepo.hasWorkspacePermissions({
        workspaceId: resourceId,
        userId,
        permissions: policy.workspace ?? [],
        allowWorkspaceOwner: this.allowsWorkspaceOwner(policy.owner),
        allowAnyMember: policy.anyMember ?? false,
      });

      if (!allowed) throw this.forbidden(action);
      return null;
    }

    const task = await this.authorizationRepo.findAuthorizedTask({
      taskId: resourceId,
      userId,
      taskPermissions: policy.task ?? [],
      workspacePermissions: policy.workspace ?? [],
      allowTaskCreator: this.allowsTaskCreator(policy.owner),
      allowWorkspaceOwner: this.allowsWorkspaceOwner(policy.owner),
      allowAnyAssignee: policy.anyAssignee ?? false,
    });

    if (!task) throw this.forbidden(action);
    return task;
  }

  private forbidden(action: PolicyAction): ForbiddenException {
    return new ForbiddenException(`You are not allowed to perform ${action}`);
  }

  private allowsWorkspaceOwner(owner: OwnerRule): boolean {
    return owner === 'workspaceOwner' || owner === 'any';
  }

  private allowsTaskCreator(owner: OwnerRule): boolean {
    return owner === 'taskCreator' || owner === 'any';
  }
}
