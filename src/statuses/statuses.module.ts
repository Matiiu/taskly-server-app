import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/login/jwt-auth.module';
import { AuthorizationModule } from '@/authorization/authorization.module';
import { StatusesResolver } from '@/statuses/statuses.resolver';
import { StatusesService } from '@/statuses/statuses.service';
import { StatusesRepository } from '@/statuses/statuses.repository';
import { StatusesListener } from '@/statuses/statuses.listener';

@Module({
  imports: [JwtAuthModule, AuthorizationModule],
  providers: [StatusesResolver, StatusesService, StatusesRepository, StatusesListener],
  exports: [StatusesService, JwtAuthModule],
})
export class StatusesModule {}
