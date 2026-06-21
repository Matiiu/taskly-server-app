import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMetaType } from '@/common/entities/pagination-meta.type';
import { CommentType } from '@/comments/entities/comment.type';

@ObjectType()
export class PaginatedCommentType {
  @Field(() => [CommentType])
  comments: CommentType[];

  @Field(() => PaginationMetaType)
  meta: PaginationMetaType;
}
