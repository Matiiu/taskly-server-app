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

import { PrismaService } from '@/prisma/prisma.service';
import type { JwtPayload } from '@/auth/types/auth.type';
import {
  CATEGORY_EXISTS_OPTIONS,
  CategoryExistsOptions,
  CategoryLookupBy,
} from '@/categories/decorators/category-exists.decorator';

type RequestWithUser = Request & {
  user?: JwtPayload;
};

@Injectable()
export class CategoryExistsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext<{ req?: RequestWithUser }>().req;
    const args = gqlContext.getArgs<Record<string, unknown>>();
    const options =
      this.reflector.getAllAndOverride<CategoryExistsOptions>(CATEGORY_EXISTS_OPTIONS, [
        context.getHandler(),
        context.getClass(),
      ]) ?? {};
    const by = options.by ?? 'id';
    const arg = options.arg;
    const value = this.resolveLookupValue(by, arg, args);
    const userId = request?.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found in request');
    }

    if (!value) {
      throw new BadRequestException(`Missing value to validate category by ${by}`);
    }

    const where = {
      ...this.toWhere(by, value),
      userId,
    };

    const category = await this.prisma.category.findFirst({
      where,
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return true;
  }

  private resolveLookupValue(
    by: CategoryLookupBy,
    arg: string | undefined,
    args: Record<string, unknown>,
  ): string | undefined {
    const argName = arg ?? by;
    const value = args[argName];

    return typeof value === 'string' ? value : undefined;
  }

  private toWhere(by: CategoryLookupBy, value: string): Record<string, string> {
    if (by === 'id') {
      return { id: value };
    }

    return { id: value };
  }
}
