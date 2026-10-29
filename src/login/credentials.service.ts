import { BadRequestException, Injectable } from '@nestjs/common';

import { comparePassword } from '@/common/utils/hash.util';
import { LoginRepository } from '@/login/login.repository';
import type { User } from 'generated/prisma/client';

/** Password checks shared by sign-in and the account flows. Returns the full user (inactive too). */
@Injectable()
export class CredentialsService {
  constructor(private readonly loginRepo: LoginRepository) {}

  /** Same error for unknown email and wrong password, so callers can't tell which accounts exist. */
  async validateByEmail(email: User['email'], password: string): Promise<User> {
    const user = await this.loginRepo.findByEmail(email);

    if (!user || !(await comparePassword(password, user.password))) {
      throw new BadRequestException('Email or password is incorrect');
    }

    return user;
  }

  /** Re-checks the password of a signed-in user before a sensitive action. */
  async validateById(id: User['id'], password: string): Promise<User> {
    const user = await this.loginRepo.findById(id);

    if (!user || !(await comparePassword(password, user.password))) {
      throw new BadRequestException('Password is incorrect');
    }

    return user;
  }
}
