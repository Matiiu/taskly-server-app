import { Field, ObjectType } from '@nestjs/graphql';

import { CommentReplyType } from '@/comments/entities/comment-reply.type';
import { MutationResponseType } from '@/common/entities/mutation-response.type';

@ObjectType()
export class CommentReplyActionType extends MutationResponseType {
  @Field(() => CommentReplyType)
  reply: CommentReplyType;
}
