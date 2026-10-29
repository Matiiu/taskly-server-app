import { Module } from '@nestjs/common';

import { LoginResolver } from '@/login/login.resolver';
import { LoginService } from '@/login/login.service';
import { RegistrationService } from '@/login/registration.service';
import { AccountService } from '@/login/account.service';
import { CredentialsService } from '@/login/credentials.service';
import { UsersModule } from '@/users/users.module';
import { JwtAuthModule } from '@/login/jwt-auth.module';
import { WorkspaceModule } from '@/workspace/workspace.module';

@Module({
  imports: [JwtAuthModule, UsersModule, WorkspaceModule],
  providers: [LoginResolver, LoginService, RegistrationService, AccountService, CredentialsService],
  exports: [LoginService, JwtAuthModule],
})
export class LoginModule {}
