import { Field, ObjectType } from '@nestjs/graphql';

import { UserType } from '@/users/entities/user.type';

@ObjectType()
export class UserActionType {
  @Field(() => String)
  message: string;

  @Field(() => UserType)
  user: UserType;
}
