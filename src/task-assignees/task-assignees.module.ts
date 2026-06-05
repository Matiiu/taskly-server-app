import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/auth/jwt-auth.module';
import { TaskAssigneesResolver } from '@/task-assignees/task-assignees.resolver';
import { TaskAssigneesService } from '@/task-assignees/task-assignees.service';

@Module({
  imports: [JwtAuthModule],
  providers: [TaskAssigneesResolver, TaskAssigneesService],
  exports: [TaskAssigneesService, JwtAuthModule],
})
export class TaskAssigneesModule {}
