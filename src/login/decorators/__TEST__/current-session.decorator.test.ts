import { ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { CurrentSession } from '@/login/decorators/current-session.decorator';
import { buildGuardContext, mockGqlContext } from '@/common/testing/factories/gql-guard.factory';
import { buildSafeUser } from '@/common/testing/factories/users.factory';
import { createJwtValidPayloadMock } from '@/common/testing/mocks/jwt-auth.mock';

type ParamFactory = (data: unknown, ctx: ExecutionContext) => unknown;

// Pulls the underlying factory fn out of a createParamDecorator() result.
const getParamDecoratorFactory = (decorator: () => ParameterDecorator): ParamFactory => {
  class TestHost {
    method(@decorator() _session: unknown): void {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestHost, 'method') as Record<
    string,
    { factory: ParamFactory }
  >;
  return args[Object.keys(args)[0]].factory;
};

describe('CurrentSession Decorator', () => {
  const factory = getParamDecoratorFactory(CurrentSession);
  const context = buildGuardContext();
  const session = createJwtValidPayloadMock();
  const user = buildSafeUser();

  it('returns the verified JWT payload stored on the request', () => {
    mockGqlContext({ session, user }, {});

    expect(factory(undefined, context)).toBe(session);
  });

  it('returns a single field when a key is passed', () => {
    mockGqlContext({ session, user }, {});

    expect(factory('jti', context)).toBe(session.jti);
  });

  it('throws InternalServerErrorException when JwtAuthGuard did not run', () => {
    mockGqlContext({}, {});

    expect(() => factory(undefined, context)).toThrow(InternalServerErrorException);
  });
});
