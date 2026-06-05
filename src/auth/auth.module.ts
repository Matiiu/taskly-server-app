import { Module } from '@nestjs/common';

import { AuthResolver } from '@/auth/auth.resolver';
import { AuthService } from '@/auth/auth.service';
import { UsersModule } from '@/users/users.module';
import { JwtAuthModule } from '@/auth/jwt-auth.module';
import { StatusesModule } from '@/statuses/statuses.module';

@Module({
  imports: [JwtAuthModule, UsersModule, StatusesModule],
  providers: [AuthResolver, AuthService],
  exports: [AuthService, JwtAuthModule],
})
export class AuthModule {}
