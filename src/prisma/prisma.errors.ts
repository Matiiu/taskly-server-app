import { Prisma } from 'generated/prisma/client';

/** Prisma error for a unique constraint violation (e.g. two concurrent creates with the same name). */
export const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
