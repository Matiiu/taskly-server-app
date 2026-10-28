import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { JWTConfig } from '@/config/jwt/jwt.config';
import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { TokenService } from '@/login/token.service';
import { LoginRepository } from '@/login/login.repository';

@Module({
  imports: [JwtModule.registerAsync(JWTConfig)],
  providers: [JwtAuthGuard, TokenService, LoginRepository],
  exports: [JwtModule, JwtAuthGuard, TokenService, LoginRepository],
})
export class JwtAuthModule {}
