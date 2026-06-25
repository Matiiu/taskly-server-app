import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { CurrentUser } from '@/auth/decorators/current-user.decorator'; // adjust path
import type { JwtPayload } from '@/auth/types/auth.type';
import { buildContext } from '@/common/testing/factories/jwt-auth.factory';
import { createJwtValidPayloadMock } from '@/common/testing/mocks/jwt-auth.mock';

// Pulls the underlying factory fn out of a createParamDecorator() result.
type ParamFactory = (
  data: unknown,
  ctx: ExecutionContext,
) => JwtPayload | JwtPayload[keyof JwtPayload];

const getParamDecoratorFactory = (decorator: () => ParameterDecorator): ParamFactory => {
  class TestHost {
    method(@decorator() _user: unknown): void {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestHost, 'method');
  // metadata is keyed like "<type>:<index>"; grab the single entry's factory
  return args[Object.keys(args)[0]].factory;
};

describe('CurrentUser Decorator', () => {
  let factory: ParamFactory;
  let validUser: JwtPayload;

  // build a GraphQL ctx whose req already carries a `user`
  const ctxWithUser = (user?: JwtPayload): ExecutionContext => buildContext({ headers: {}, user });

  beforeEach(() => {
    factory = getParamDecoratorFactory(CurrentUser);
    validUser = createJwtValidPayloadMock();
  });

  it('returns the whole user object when no key is passed', () => {
    const ctx = ctxWithUser(validUser);
    const result = factory(undefined, ctx);
    expect(result).toEqual(validUser);
  });

  const fields: (keyof JwtPayload)[] = ['sub', 'jti', 'code'];

  it.each(fields)('returns the correct field when key is passed: %s', (field) => {
    const ctx = ctxWithUser(validUser);
    const result = factory(field, ctx);
    expect(result).toEqual(validUser[field]);
  });

  it('throws UnauthorizedException when there is no user on the request', () => {
    const ctx = ctxWithUser(undefined);
    const result = () => factory(undefined, ctx);
    expect(result).toThrow(new UnauthorizedException('User not found in request context'));
  });

  it('throws UnauthorizedException when the request itself is missing', () => {
    const ctx = buildContext(undefined);
    const result = () => factory(undefined, ctx);
    expect(result).toThrow(new UnauthorizedException('User not found in request context'));
  });
});
