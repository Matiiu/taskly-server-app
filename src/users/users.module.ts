import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/login/jwt-auth.module';
import { UsersResolver } from '@/users/users.resolver';
import { UsersService } from '@/users/users.service';
import { UsersRepository } from '@/users/users.repository';
import { TargetUserGuard } from '@/users/guards/target-user.guard';

@Module({
  imports: [JwtAuthModule],
  providers: [UsersResolver, UsersService, UsersRepository, TargetUserGuard],
  exports: [UsersService, JwtAuthModule],
})
export class UsersModule {}
