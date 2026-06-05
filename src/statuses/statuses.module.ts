import { Module } from '@nestjs/common';

import { JwtAuthModule } from '@/auth/jwt-auth.module';
import { StatusesResolver } from '@/statuses/statuses.resolver';
import { StatusesService } from '@/statuses/statuses.service';
import { StatusExistsGuard } from '@/statuses/guards/status-exists.guard';

@Module({
  imports: [JwtAuthModule],
  providers: [StatusesResolver, StatusesService, StatusExistsGuard],
  exports: [StatusesService, JwtAuthModule],
})
export class StatusesModule {}
