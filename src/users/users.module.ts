import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/auth/jwt-auth.module';
import { UsersResolver } from '@/users/users.resolver';
import { UsersService } from '@/users/users.service';
import { UserExistsGuard } from '@/users/guards/user-exists.guard';

@Module({
  imports: [JwtAuthModule],
  providers: [UsersResolver, UsersService, UserExistsGuard],
  exports: [UsersService, JwtAuthModule],
})
export class UsersModule {}
