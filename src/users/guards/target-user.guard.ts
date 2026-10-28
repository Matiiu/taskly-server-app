import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import type { User } from 'generated/prisma/client';
import { AuthenticatedUserNotFoundException } from '@/common/exceptions/authenticated-user-not-found.exception';
import { UsersService } from '@/users/users.service';
import { assertCanActOnUser } from '@/users/utils/user-access.util';
import type { SafeUser, TargetUserRequest } from '@/users/types/users.type';

/**
 * Resolves whose data the handler acts on, from its optional `id` argument:
 * no id (or your own) means yourself; another user's id is allowed for admins only.
 * Must run after JwtAuthGuard. Read the result with @TargetUser().
 */
@Injectable()
export class TargetUserGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext<{ req?: TargetUserRequest }>().req;
    const { id } = gqlContext.getArgs<{ id?: User['id'] | null }>();

    if (!request?.user) {
      throw new AuthenticatedUserNotFoundException();
    }

    request.targetUser = await this.resolveTarget(request.user, id);

    return true;
  }

  private async resolveTarget(me: SafeUser, id?: User['id'] | null): Promise<SafeUser> {
    if (!id || id === me.id) {
      return me;
    }

    // Checked before the lookup, so non-admins can't probe which ids exist (403, never 404)
    assertCanActOnUser(me, id);

    return this.usersService.findByIdOrThrow(id);
  }
}
