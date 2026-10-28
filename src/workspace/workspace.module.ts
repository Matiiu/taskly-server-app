import { Module } from '@nestjs/common';

import { WorkspaceService } from '@/workspace/workspace.service';
import { WorkspaceRepository } from '@/workspace/workspace.repository';

@Module({
  providers: [WorkspaceService, WorkspaceRepository],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
