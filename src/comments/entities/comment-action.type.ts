import { Field, ObjectType } from '@nestjs/graphql';

import { CommentType } from '@/comments/entities/comment.type';
import { MutationResponseType } from '@/common/entities/mutation-response.type';

@ObjectType()
export class CommentActionType extends MutationResponseType {
  @Field(() => CommentType)
  comment: CommentType;
}
