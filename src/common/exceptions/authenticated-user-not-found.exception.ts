import { UnauthorizedException } from '@nestjs/common';

/**
 * Thrown when a guard runs without a user on the request (e.g. JwtAuthGuard did not run first).
 */
export class AuthenticatedUserNotFoundException extends UnauthorizedException {
  constructor() {
    super('Authenticated user not found in request');
  }
}
