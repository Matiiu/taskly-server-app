import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CommentAuthorType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  firstSurname: string;

  @Field(() => String, { nullable: true })
  secondSurname: string | null;

  @Field(() => String)
  email: string;

  @Field(() => String)
  code: string;
}
