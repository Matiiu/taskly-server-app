import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CommentAuthorType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  lastName: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  code: string;
}
