import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/login/jwt-auth.module';
import { AuthorizationModule } from '@/authorization/authorization.module';
import { TaskRolesResolver } from '@/task-roles/task-roles.resolver';
import { TaskRolesService } from '@/task-roles/task-roles.service';
import { TaskRolesRepository } from '@/task-roles/task-roles.repository';
import { TaskRolesListener } from '@/task-roles/task-roles.listener';

@Module({
  imports: [JwtAuthModule, AuthorizationModule],
  providers: [TaskRolesService, TaskRolesResolver, TaskRolesRepository, TaskRolesListener],
  exports: [TaskRolesService],
})
export class TaskRolesModule {}
