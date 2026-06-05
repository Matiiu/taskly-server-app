import { Module } from '@nestjs/common';

import { CategoriesService } from '@/categories/categories.service';
import { CategoriesResolver } from '@/categories/categories.resolver';
import { JwtAuthModule } from '@/auth/jwt-auth.module';
import { CategoryExistsGuard } from '@/categories/guards/category-exists.guard';

@Module({
  imports: [JwtAuthModule],
  providers: [CategoriesService, CategoriesResolver, CategoryExistsGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
