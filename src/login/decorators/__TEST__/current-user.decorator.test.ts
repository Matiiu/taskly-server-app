import { ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { CurrentUser } from '@/login/decorators/current-user.decorator';
import { buildGuardContext, mockGqlContext } from '@/common/testing/factories/gql-guard.factory';
import { buildSafeUser } from '@/common/testing/factories/users.factory';
import { createJwtValidPayloadMock } from '@/common/testing/mocks/jwt-auth.mock';

type ParamFactory = (data: unknown, ctx: ExecutionContext) => unknown;

// Pulls the underlying factory fn out of a createParamDecorator() result.
const getParamDecoratorFactory = (decorator: () => ParameterDecorator): ParamFactory => {
  class TestHost {
    method(@decorator() _user: unknown): void {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestHost, 'method') as Record<
    string,
    { factory: ParamFactory }
  >;
  return args[Object.keys(args)[0]].factory;
};

describe('CurrentUser Decorator', () => {
  const factory = getParamDecoratorFactory(CurrentUser);
  const context = buildGuardContext();
  const session = createJwtValidPayloadMock();
  const user = buildSafeUser();

  it('returns the user JwtAuthGuard stored on the request', () => {
    mockGqlContext({ session, user }, {});

    expect(factory(undefined, context)).toBe(user);
  });

  it.each(['id', 'code', 'email'] as const)(
    'returns a single field when a key is passed: %s',
    (key) => {
      mockGqlContext({ session, user }, {});

      expect(factory(key, context)).toBe(user[key]);
    },
  );

  it('never exposes a password', () => {
    mockGqlContext({ session, user }, {});

    expect(factory(undefined, context)).not.toHaveProperty('password');
  });

  it('throws InternalServerErrorException when JwtAuthGuard did not run', () => {
    mockGqlContext({}, {});

    expect(() => factory(undefined, context)).toThrow(InternalServerErrorException);
  });
});
