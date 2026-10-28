import { Module } from '@nestjs/common';

import { AuthorizationRepository } from '@/authorization/authorization.repository';
import { AuthorizationService } from '@/authorization/authorization.service';
import { PolicyGuard } from '@/authorization/guards/policy.guard';

@Module({
  providers: [AuthorizationRepository, AuthorizationService, PolicyGuard],
  exports: [AuthorizationService, PolicyGuard],
})
export class AuthorizationModule {}
