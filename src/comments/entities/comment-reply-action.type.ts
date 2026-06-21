import { Field, ObjectType } from '@nestjs/graphql';

import { CommentReplyType } from '@/comments/entities/comment-reply.type';

@ObjectType()
export class CommentReplyActionType {
  @Field(() => String)
  message: string;

  @Field(() => CommentReplyType)
  reply: CommentReplyType;
}
