import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service';
import type { Db } from '@/prisma/prisma.types';
import type { Workspace } from 'generated/prisma/client';

export type CreateWorkspaceData = Pick<
  Workspace,
  'name' | 'code' | 'taskPrefix' | 'description' | 'isDefault' | 'ownerId'
>;

@Injectable()
export class WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateWorkspaceData, db: Db = this.prisma): Promise<Workspace> {
    return db.workspace.create({ data });
  }
}
