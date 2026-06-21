import { Field, ObjectType } from '@nestjs/graphql';

import { CommentType } from '@/comments/entities/comment.type';

@ObjectType()
export class CommentActionType {
  @Field(() => String)
  message: string;

  @Field(() => CommentType)
  comment: CommentType;
}
