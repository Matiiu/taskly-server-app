import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const buildGuardContext = (): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
  }) as unknown as ExecutionContext;

export const mockGqlContext = (
  req: Record<string, unknown>,
  args: Record<string, unknown>,
): void => {
  jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
    getContext: () => ({ req }),
    getArgs: () => args,
  } as unknown as GqlExecutionContext);
};
