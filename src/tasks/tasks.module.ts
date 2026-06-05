import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/auth/jwt-auth.module';
import { TasksResolver } from '@/tasks/tasks.resolver';
import { TasksService } from '@/tasks/tasks.service';
import { UserExistsGuard } from '@/users/guards/user-exists.guard';
import { TaskExistsGuard } from '@/tasks/guards/task-exists.guard';
import { StatusesModule } from '@/statuses/statuses.module';
import { CategoriesModule } from '@/categories/categories.module';

@Module({
  imports: [JwtAuthModule, StatusesModule, CategoriesModule],
  providers: [TasksResolver, TasksService, UserExistsGuard, TaskExistsGuard],
  exports: [TasksService, JwtAuthModule],
})
export class TasksModule {}
