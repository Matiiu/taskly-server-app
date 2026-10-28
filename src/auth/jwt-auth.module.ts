import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { JWTConfig } from '@/config/jwt/jwt.config';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { TokenService } from '@/auth/token.service';
import { AuthRepository } from '@/auth/auth.repository';

@Module({
  imports: [JwtModule.registerAsync(JWTConfig)],
  providers: [JwtAuthGuard, TokenService, AuthRepository],
  exports: [JwtModule, JwtAuthGuard, TokenService, AuthRepository],
})
export class JwtAuthModule {}
