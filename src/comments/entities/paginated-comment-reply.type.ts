import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMetaType } from '@/common/entities/pagination-meta.type';
import { CommentReplyType } from '@/comments/entities/comment-reply.type';

@ObjectType()
export class PaginatedCommentReplyType {
  @Field(() => [CommentReplyType])
  replies: CommentReplyType[];

  @Field(() => PaginationMetaType)
  meta: PaginationMetaType;
}
