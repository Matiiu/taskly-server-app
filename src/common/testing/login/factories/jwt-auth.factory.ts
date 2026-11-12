import { ExecutionContext } from '@nestjs/common';

export const buildContext = (req: unknown): ExecutionContext => {
  const gqlCtx = { req };
  const args = [undefined, undefined, gqlCtx, undefined];
  return {
    getArgs: () => args,
    getArgByIndex: (i: number) => args[i],
    getType: () => 'graphql',
    switchToHttp: () => ({}),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
};

export const buildReq = (authHeader?: string) => ({
  headers: authHeader ? { authorization: authHeader } : {},
});
