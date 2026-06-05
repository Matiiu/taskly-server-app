import { ObjectType, Field } from '@nestjs/graphql';
import { UserType } from '@/users/entities/user.type';

@ObjectType()
export class RegisterType {
  @Field(() => UserType)
  user: UserType;

  @Field(() => String)
  token: string;

  @Field(() => String, { nullable: true })
  message?: string;
}
