import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { AuthService } from '@/auth/auth.service';
import { RegisterInput } from '@/auth/dto/register.input';
import { RegisterType } from '@/auth/entities/register.type';
import { RecoverPasswordInput } from '@/auth/dto/recover-password.input';
import { SignInInput } from '@/auth/dto/sign-in.input';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => RegisterType, { name: 'register' })
  async register(@Args('input') input: RegisterInput): Promise<RegisterType> {
    const { user, token } = await this.authService.register(input);
    const fullName = `${user.name} ${user.lastName}`;

    return {
      user,
      token,
      message: `User ${fullName} registered successfully`,
    };
  }

  @Mutation(() => RegisterType, { name: 'signIn' })
  async signIn(@Args('input') input: SignInInput): Promise<RegisterType> {
    const { user, token } = await this.authService.signIn(input);
    const fullName = `${user.name} ${user.lastName}`;

    return {
      user,
      token,
      message: `User ${fullName} signed in successfully`,
    };
  }

  @Mutation(() => RegisterType, { name: 'recoverPassword' })
  async recoverPassword(@Args('input') input: RecoverPasswordInput): Promise<RegisterType> {
    return {
      ...(await this.authService.recoverPassword(input)),
      message: 'Password recovered successfully',
    };
  }

  @Query(() => [String], { name: 'suggestedCodes' })
  async suggestCodes(
    @Args('name') name: string,
    @Args('lastName') lastName: string,
  ): Promise<string[]> {
    return this.authService.suggestCodes({ name, lastName });
  }

  @Mutation(() => Boolean, { name: 'logout' })
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser('jti') jti: string,
    @CurrentUser('sub') userId: string,
  ): Promise<boolean> {
    await this.authService.logout({ jti, userId });
    return true;
  }
}
