import type { Prisma } from 'generated/prisma/client';

import type { PrismaService } from '@/prisma/prisma.service';

/**
 * Prisma client a repository method can run on:
 * the normal PrismaService, or the `tx` client inside `prisma.$transaction`.
 */
export type Db = PrismaService | Prisma.TransactionClient;
