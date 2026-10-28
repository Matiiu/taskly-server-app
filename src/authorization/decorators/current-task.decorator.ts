import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import type { AuthorizedRequest } from '@/authorization/types/request.type';
import type { TaskWithRelations } from '@/tasks/tasks.repository';

/**
 * The task PolicyGuard loaded and authorized for a task-scope @Can() policy.
 */
export const CurrentTask = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TaskWithRelations => {
    const request = GqlExecutionContext.create(context).getContext<{ req?: AuthorizedRequest }>()
      .req;

    // Missing task means @CurrentTask() is used without PolicyGuard + a task-scope @Can()
    if (!request?.task) {
      throw new InternalServerErrorException(
        '@CurrentTask() requires PolicyGuard with a task-scope @Can() policy',
      );
    }

    return request.task;
  },
);
