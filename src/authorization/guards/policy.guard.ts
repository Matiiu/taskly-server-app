import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';

import { AuthenticatedUserNotFoundException } from '@/common/exceptions/authenticated-user-not-found.exception';
import { AuthorizationService } from '@/authorization/authorization.service';
import { CAN_ACTION_KEY } from '@/authorization/decorators/can.decorator';
import type { PolicyAction } from '@/authorization/policies';
import type { AuthorizedRequest } from '@/authorization/types/request.type';

/**
 * Enforces the policy named by @Can() on the handler. Must run after JwtAuthGuard.
 * For task-scope policies it also stores the authorized task on the request (read it with @CurrentTask()).
 */
@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.getAllAndOverride<PolicyAction | undefined>(CAN_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Fail closed: a PolicyGuard without @Can() is a wiring mistake, not a public route
    if (!action) {
      throw new ForbiddenException('No authorization policy defined for this operation');
    }

    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext<{ req?: AuthorizedRequest }>().req;
    const args = gqlContext.getArgs<Record<string, unknown>>();
    const userId = request?.user?.id;

    if (!userId) {
      throw new AuthenticatedUserNotFoundException();
    }

    const { arg } = this.authorizationService.getPolicy(action);
    const resourceId = args[arg];

    if (typeof resourceId !== 'string' || !resourceId) {
      throw new BadRequestException(`Missing argument "${arg}" to authorize ${action}`);
    }

    const task = await this.authorizationService.authorize(action, userId, resourceId);

    // Task-scope policies already loaded the task; @CurrentTask() hands it to the resolver
    if (task) request.task = task;

    return true;
  }
}
