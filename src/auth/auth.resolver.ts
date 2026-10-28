import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { AuthService } from '@/auth/auth.service';
import { RegisterInput } from '@/auth/dto/register.input';
import { RecoverPasswordInput } from '@/auth/dto/recover-password.input';
import { SignInInput } from '@/auth/dto/sign-in.input';
import { SuggestCodesInput } from '@/auth/dto/suggest-codes.input';
import { DeleteAccountInput } from '@/auth/dto/delete-account.input';
import { RecoverAccountInput } from '@/auth/dto/recover-account.input';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CurrentSession } from '@/auth/decorators/current-session.decorator';
import { UserType } from '@/users/entities/user.type';
import { MutationPayload } from '@/common/entities/mutation-payload.factory';
import type { User } from 'generated/prisma/client';

const RegisterPayload = MutationPayload('RegisterPayload', { user: UserType });
const AuthTokenPayload = MutationPayload('AuthTokenPayload', { token: String });
const DeleteAccountPayload = MutationPayload('DeleteAccountPayload', {});

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => RegisterPayload, { name: 'register' })
  async register(
    @Args('input') input: RegisterInput,
  ): Promise<InstanceType<typeof RegisterPayload>> {
    const user = await this.authService.register(input);
    const fullName = `${user.name} ${user.firstSurname}`;

    return {
      user,
      message: `User ${fullName} registered successfully`,
    };
  }

  @Mutation(() => AuthTokenPayload, { name: 'signIn' })
  async signIn(@Args('input') input: SignInInput): Promise<InstanceType<typeof AuthTokenPayload>> {
    const token = await this.authService.signIn(input);

    return {
      token,
      message: `signed in successfully`,
    };
  }

  @Mutation(() => AuthTokenPayload, { name: 'recoverPassword' })
  async recoverPassword(
    @Args('input') input: RecoverPasswordInput,
  ): Promise<InstanceType<typeof AuthTokenPayload>> {
    const token = await this.authService.recoverPassword(input);

    return {
      token,
      message: 'Password recovered successfully',
    };
  }

  @Query(() => [String], { name: 'suggestedCodes' })
  async suggestCodes(@Args('input') input: SuggestCodesInput): Promise<string[]> {
    return this.authService.suggestCodes(input);
  }

  @Mutation(() => Boolean, { name: 'logout' })
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentSession('jti') jti: string,
    @CurrentUser('id') userId: User['id'],
  ): Promise<boolean> {
    await this.authService.logout({ jti, userId });
    return true;
  }

  @Mutation(() => DeleteAccountPayload, { name: 'deleteAccount' })
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @CurrentUser('id') userId: User['id'],
    @Args('input') { password }: DeleteAccountInput,
  ): Promise<InstanceType<typeof DeleteAccountPayload>> {
    await this.authService.deleteAccount({ userId, password });

    return { message: 'Account deleted successfully' };
  }

  @Mutation(() => AuthTokenPayload, { name: 'recoverAccount' })
  async recoverAccount(
    @Args('input') input: RecoverAccountInput,
  ): Promise<InstanceType<typeof AuthTokenPayload>> {
    const token = await this.authService.recoverAccount(input);

    return {
      token,
      message: 'Account recovered successfully',
    };
  }
}
