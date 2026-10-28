import { Module } from '@nestjs/common';

import { LoginResolver } from '@/login/login.resolver';
import { LoginService } from '@/login/login.service';
import { UsersModule } from '@/users/users.module';
import { JwtAuthModule } from '@/login/jwt-auth.module';
import { WorkspaceModule } from '@/workspace/workspace.module';

@Module({
  imports: [JwtAuthModule, UsersModule, WorkspaceModule],
  providers: [LoginResolver, LoginService],
  exports: [LoginService, JwtAuthModule],
})
export class LoginModule {}
