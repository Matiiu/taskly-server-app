import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';

import { TokenService } from '@/login/token.service';
import type { AuthenticatedRequest } from '@/login/types/login.type';

/**
 * Verifies the Bearer token and stores the session and the user on the request
 * (read them with @CurrentSession() and @CurrentUser()).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext<{ req?: AuthenticatedRequest }>().req;

    if (!request) {
      throw new UnauthorizedException('Request not found');
    }

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const { session, user } = await this.tokenService.verify(token);
    request.session = session;
    request.user = user;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
