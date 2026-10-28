import { ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { TargetUser } from '@/users/decorators/target-user.decorator';
import { buildGuardContext, mockGqlContext } from '@/common/testing/factories/gql-guard.factory';
import { buildSafeUser } from '@/common/testing/factories/users.factory';

type ParamFactory = (data: unknown, ctx: ExecutionContext) => unknown;

// Pulls the underlying factory fn out of a createParamDecorator() result.
const getParamDecoratorFactory = (decorator: () => ParameterDecorator): ParamFactory => {
  class TestHost {
    method(@decorator() _target: unknown): void {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestHost, 'method') as Record<
    string,
    { factory: ParamFactory }
  >;
  return args[Object.keys(args)[0]].factory;
};

describe('TargetUser Decorator', () => {
  const factory = getParamDecoratorFactory(TargetUser);
  const context = buildGuardContext();

  it('returns the user TargetUserGuard stored on the request', () => {
    const targetUser = buildSafeUser({ id: 'other' });
    mockGqlContext({ user: buildSafeUser(), targetUser }, {});

    expect(factory(undefined, context)).toBe(targetUser);
  });

  it('throws InternalServerErrorException when TargetUserGuard did not run', () => {
    mockGqlContext({ user: buildSafeUser() }, {});

    expect(() => factory(undefined, context)).toThrow(InternalServerErrorException);
  });
});
