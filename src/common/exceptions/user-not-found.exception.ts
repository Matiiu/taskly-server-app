import { NotFoundException } from '@nestjs/common';

import type { User } from 'generated/prisma/client';

const DEFAULT_MESSAGE = 'User not found';

/** Fields a user can be looked up by. To add one: add it here and give it a label below. */
type LookupField = 'code' | 'documentNumber';

const LOOKUP_LABELS: Record<LookupField, string> = {
  code: 'code',
  documentNumber: 'document',
};

/** Exactly one lookup field, e.g. `{ code }` or `{ documentNumber }` (the others are `never`). */
export type UserNotFoundBy = {
  [K in LookupField]: Pick<User, K> & { [Other in Exclude<LookupField, K>]?: never };
}[LookupField];

const toMessage = (by?: UserNotFoundBy): string => {
  if (!by) return DEFAULT_MESSAGE;

  const [field, value] = Object.entries(by)[0] as [LookupField, string];
  return `User with ${LOOKUP_LABELS[field]} ${value} not found`;
};

/**
 * 404 for a missing user. Without `by` (e.g. a lookup by id) the message is generic:
 * `new UserNotFoundException({ code: '@mateo' })` → "User with code @mateo not found".
 */
export class UserNotFoundException extends NotFoundException {
  constructor(by?: UserNotFoundBy) {
    super(toMessage(by));
  }
}
