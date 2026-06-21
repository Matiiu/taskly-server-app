import { Field, ObjectType } from '@nestjs/graphql';

import { CommentAuthorType } from '@/comments/entities/comment-author.type';

@ObjectType()
export class CommentReplyType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  content: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Boolean)
  edited: boolean;

  @Field(() => Boolean)
  active: boolean;

  @Field(() => String)
  commentId: string;

  @Field(() => String)
  userId: string;

  @Field(() => CommentAuthorType)
  user: CommentAuthorType;
}
