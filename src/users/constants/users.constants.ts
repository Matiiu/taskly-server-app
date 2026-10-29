import type { Prisma } from 'generated/prisma/client';

/** Prisma `omit` that leaves the password hash out of a user read. */
export const OMIT_PASSWORD = { password: true } as const satisfies Prisma.UserOmit;

/** Days a deleted account can be recovered before it is released for good. */
export const ACCOUNT_RECOVERY_DAYS = 30;
