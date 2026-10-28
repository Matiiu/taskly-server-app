import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/auth/jwt-auth.module';
import { AuthorizationModule } from '@/authorization/authorization.module';
import { StatusesResolver } from '@/statuses/statuses.resolver';
import { StatusesService } from '@/statuses/statuses.service';
import { StatusesRepository } from '@/statuses/statuses.repository';

@Module({
  imports: [JwtAuthModule, AuthorizationModule],
  providers: [StatusesResolver, StatusesService, StatusesRepository],
  exports: [StatusesService, JwtAuthModule],
})
export class StatusesModule {}
