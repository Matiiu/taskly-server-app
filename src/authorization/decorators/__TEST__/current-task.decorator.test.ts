import { ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { CurrentTask } from '@/authorization/decorators/current-task.decorator';
import { buildGuardContext, mockGqlContext } from '@/common/testing/factories/gql-guard.factory';

type ParamFactory = (data: unknown, ctx: ExecutionContext) => unknown;

// Pulls the underlying factory fn out of a createParamDecorator() result.
const getParamDecoratorFactory = (decorator: () => ParameterDecorator): ParamFactory => {
  class TestHost {
    method(@decorator() _task: unknown): void {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestHost, 'method') as Record<
    string,
    { factory: ParamFactory }
  >;
  return args[Object.keys(args)[0]].factory;
};

describe('CurrentTask Decorator', () => {
  const factory = getParamDecoratorFactory(CurrentTask);
  const context = buildGuardContext();

  it('returns the task PolicyGuard stored on the request', () => {
    const task = { id: 'task-1', title: 'Write tests' };
    mockGqlContext({ user: { id: 'user-1' }, task }, {});

    expect(factory(undefined, context)).toBe(task);
  });

  it('throws InternalServerErrorException when no task was stored', () => {
    mockGqlContext({ user: { id: 'user-1' } }, {});

    expect(() => factory(undefined, context)).toThrow(InternalServerErrorException);
  });
});
