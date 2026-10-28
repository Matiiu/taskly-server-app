import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/login/jwt-auth.module';
import { TasksResolver } from '@/tasks/tasks.resolver';
import { TasksService } from '@/tasks/tasks.service';
import { StatusesModule } from '@/statuses/statuses.module';
import { CategoriesModule } from '@/categories/categories.module';
import { AuthorizationModule } from '@/authorization/authorization.module';
import { TasksRepository } from '@/tasks/tasks.repository';

@Module({
  imports: [JwtAuthModule, StatusesModule, CategoriesModule, AuthorizationModule],
  providers: [TasksResolver, TasksService, TasksRepository],
  exports: [TasksService, JwtAuthModule],
})
export class TasksModule {}
