import type { Type } from '@nestjs/common';
import { Field, ObjectType } from '@nestjs/graphql';

import { MutationResponseType } from '@/common/entities/mutation-response.type';

type PayloadField = Type<unknown> | StringConstructor | NumberConstructor | BooleanConstructor;

type ResolveField<F> = F extends StringConstructor
  ? string
  : F extends NumberConstructor
    ? number
    : F extends BooleanConstructor
      ? boolean
      : F extends Type<infer T>
        ? T
        : never;

export type MutationPayloadOf<F extends Record<string, PayloadField>> = MutationResponseType & {
  [K in keyof F]: ResolveField<F[K]>;
};

const payloads = new Map<string, Type<unknown>>();

/**
 * Builds a mutation payload type (`message` + the given fields) without a dedicated class file.
 * Each name is registered once in the schema; calling again with the same name reuses it.
 *
 * @example
 * const RegisterPayload = MutationPayload('RegisterPayload', { user: UserType });
 *
 * @Mutation(() => RegisterPayload)
 * register(): Promise<InstanceType<typeof RegisterPayload>> { ... }
 */
export function MutationPayload<F extends Record<string, PayloadField>>(
  name: string,
  fields: F,
): Type<MutationPayloadOf<F>> {
  const existing = payloads.get(name);

  if (existing) {
    return existing as Type<MutationPayloadOf<F>>;
  }

  @ObjectType(name)
  class Payload extends MutationResponseType {}

  for (const [key, fieldType] of Object.entries(fields)) {
    Field(() => fieldType)(Payload.prototype, key);
  }

  payloads.set(name, Payload);

  return Payload as Type<MutationPayloadOf<F>>;
}
