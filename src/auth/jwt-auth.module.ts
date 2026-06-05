import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { JWTConfig } from '@/config/jwt/jwt.config';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Module({
  imports: [JwtModule.registerAsync(JWTConfig)],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class JwtAuthModule {}
