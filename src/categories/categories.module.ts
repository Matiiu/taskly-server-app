import { Module } from '@nestjs/common';

import { CategoriesService } from '@/categories/categories.service';
import { CategoriesResolver } from '@/categories/categories.resolver';
import { CategoriesRepository } from '@/categories/categories.repository';
import { JwtAuthModule } from '@/login/jwt-auth.module';
import { AuthorizationModule } from '@/authorization/authorization.module';

@Module({
  imports: [JwtAuthModule, AuthorizationModule],
  providers: [CategoriesService, CategoriesResolver, CategoriesRepository],
  exports: [CategoriesService],
})
export class CategoriesModule {}
