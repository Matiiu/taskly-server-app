import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/login/jwt-auth.module';
import { AuthorizationModule } from '@/authorization/authorization.module';
import { TaskRolesResolver } from '@/task-roles/task-roles.resolver';
import { TaskRolesService } from '@/task-roles/task-roles.service';
import { TaskRolesRepository } from '@/task-roles/task-roles.repository';

@Module({
  imports: [JwtAuthModule, AuthorizationModule],
  providers: [TaskRolesService, TaskRolesResolver, TaskRolesRepository],
  exports: [TaskRolesService],
})
export class TaskRolesModule {}
