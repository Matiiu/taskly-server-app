import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/login/jwt-auth.module';
import { TaskAssigneesResolver } from '@/task-assignees/task-assignees.resolver';
import { TaskAssigneesService } from '@/task-assignees/task-assignees.service';
import { TaskAssigneesRepository } from '@/task-assignees/task-assignees.repository';
import { UsersModule } from '@/users/users.module';
import { TaskRolesModule } from '@/task-roles/task-roles.module';

@Module({
  imports: [JwtAuthModule, UsersModule, TaskRolesModule],
  providers: [TaskAssigneesResolver, TaskAssigneesService, TaskAssigneesRepository],
  exports: [TaskAssigneesService, JwtAuthModule],
})
export class TaskAssigneesModule {}
