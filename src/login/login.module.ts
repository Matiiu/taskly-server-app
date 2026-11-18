import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { LoginResolver } from '@/login/login.resolver';
import { LoginService } from '@/login/login.service';
import { RegistrationService } from '@/login/registration.service';
import { AccountService } from '@/login/account.service';
import { CredentialsService } from '@/login/credentials.service';
import { UsersModule } from '@/users/users.module';
import { JwtAuthModule } from '@/login/jwt-auth.module';
import { WorkspaceModule } from '@/workspace/workspace.module';
import { MailModule } from '@/common/mail/mail.module';
import { mailConfig } from '@/config/mail/mail.config';
import { PasswordResetMailListener } from '@/login/listeners/password-reset-mail.listener';

@Module({
  imports: [
    ConfigModule.forFeature(mailConfig),
    JwtAuthModule,
    UsersModule,
    WorkspaceModule,
    MailModule,
  ],
  providers: [
    LoginResolver,
    LoginService,
    RegistrationService,
    AccountService,
    CredentialsService,
    PasswordResetMailListener,
  ],
  exports: [LoginService, JwtAuthModule],
})
export class LoginModule {}
