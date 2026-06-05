import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import type { JwtPayload } from '@/auth/types/auth.type';
import { PrismaService } from '@/prisma/prisma.service';
import {
  USER_EXISTS_OPTIONS,
  UserExistsOptions,
  UserLookupBy,
} from '@/users/decorators/user-exists.decorator';

type RequestWithUser = Request & {
  user?: JwtPayload;
};

@Injectable()
export class UserExistsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext<{ req?: RequestWithUser }>().req;
    const args = gqlContext.getArgs<Record<string, unknown>>();
    const options =
      this.reflector.getAllAndOverride<UserExistsOptions>(USER_EXISTS_OPTIONS, [
        context.getHandler(),
        context.getClass(),
      ]) ?? {};
    const by = options.by ?? 'authSub';
    const arg = options.arg;
    const requireActive = options.requireActive ?? true;
    const value = this.resolveLookupValue(by, arg, request, args);

    if (!value) {
      if (by === 'authSub') {
        throw new UnauthorizedException('Authenticated user not found in request');
      }
      throw new BadRequestException(`Missing value to validate user by ${by}`);
    }

    const where = {
      ...this.toWhere(by, value),
      ...(requireActive ? { active: true } : {}),
    };

    const user = await this.prisma.user.findFirst({
      where,
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return true;
  }

  private resolveLookupValue(
    by: UserLookupBy,
    arg: string | undefined,
    request: RequestWithUser | undefined,
    args: Record<string, unknown>,
  ): string | undefined {
    if (by === 'authSub') {
      return request?.user?.sub;
    }

    const argName = arg ?? by;
    const value = args[argName];

    return typeof value === 'string' ? value : undefined;
  }

  private toWhere(by: UserLookupBy, value: string): Record<string, string> {
    if (by === 'authSub' || by === 'id') {
      return { id: value };
    }

    if (by === 'code') {
      return { code: value };
    }

    return { documentNumber: value };
  }
}
