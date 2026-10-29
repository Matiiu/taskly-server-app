import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { LoginService } from '@/login/login.service';
import { RegistrationService } from '@/login/registration.service';
import { AccountService } from '@/login/account.service';
import { RegisterInput } from '@/login/dto/register.input';
import { RecoverPasswordInput } from '@/login/dto/recover-password.input';
import { SignInInput } from '@/login/dto/sign-in.input';
import { SuggestCodesInput } from '@/login/dto/suggest-codes.input';
import { DeleteAccountInput } from '@/login/dto/delete-account.input';
import { RecoverAccountInput } from '@/login/dto/recover-account.input';
import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { CurrentUser } from '@/login/decorators/current-user.decorator';
import { CurrentSession } from '@/login/decorators/current-session.decorator';
import { UserType } from '@/users/entities/user.type';
import { MutationPayload } from '@/common/entities/mutation-payload.factory';
import type { User } from 'generated/prisma/client';

const RegisterPayload = MutationPayload('RegisterPayload', { user: UserType });
const LoginTokenPayload = MutationPayload('LoginTokenPayload', { token: String });
const DeleteAccountPayload = MutationPayload('DeleteAccountPayload', {});

@Resolver()
export class LoginResolver {
  constructor(
    private readonly loginService: LoginService,
    private readonly registrationService: RegistrationService,
    private readonly accountService: AccountService,
  ) {}

  @Mutation(() => RegisterPayload, { name: 'register' })
  async register(
    @Args('input') input: RegisterInput,
  ): Promise<InstanceType<typeof RegisterPayload>> {
    const user = await this.registrationService.register(input);
    const fullName = `${user.name} ${user.firstSurname}`;

    return {
      user,
      message: `User ${fullName} registered successfully`,
    };
  }

  @Mutation(() => LoginTokenPayload, { name: 'signIn' })
  async signIn(@Args('input') input: SignInInput): Promise<InstanceType<typeof LoginTokenPayload>> {
    const token = await this.loginService.signIn(input);

    return {
      token,
      message: `signed in successfully`,
    };
  }

  @Mutation(() => LoginTokenPayload, { name: 'recoverPassword' })
  async recoverPassword(
    @Args('input') input: RecoverPasswordInput,
  ): Promise<InstanceType<typeof LoginTokenPayload>> {
    const token = await this.loginService.recoverPassword(input);

    return {
      token,
      message: 'Password recovered successfully',
    };
  }

  @Query(() => [String], { name: 'suggestedCodes' })
  async suggestCodes(@Args('input') input: SuggestCodesInput): Promise<string[]> {
    return this.registrationService.suggestCodes(input);
  }

  @Mutation(() => Boolean, { name: 'logout' })
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentSession('jti') jti: string,
    @CurrentUser('id') userId: User['id'],
  ): Promise<boolean> {
    await this.loginService.logout({ jti, userId });
    return true;
  }

  @Mutation(() => DeleteAccountPayload, { name: 'deleteAccount' })
  @UseGuards(JwtAuthGuard)
  async deleteAccount(
    @CurrentUser('id') userId: User['id'],
    @Args('input') { password }: DeleteAccountInput,
  ): Promise<InstanceType<typeof DeleteAccountPayload>> {
    await this.accountService.deleteAccount({ userId, password });

    return { message: 'Account deleted successfully' };
  }

  @Mutation(() => LoginTokenPayload, { name: 'recoverAccount' })
  async recoverAccount(
    @Args('input') input: RecoverAccountInput,
  ): Promise<InstanceType<typeof LoginTokenPayload>> {
    const token = await this.accountService.recoverAccount(input);

    return {
      token,
      message: 'Account recovered successfully',
    };
  }
}
