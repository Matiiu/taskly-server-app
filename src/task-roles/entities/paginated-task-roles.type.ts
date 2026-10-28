import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMetaType } from '@/common/entities/pagination-meta.type';
import { TaskRoleType } from '@/task-roles/entities/task-role.type';

@ObjectType()
export class PaginatedTaskRolesType {
  @Field(() => [TaskRoleType])
  taskRoles: TaskRoleType[];

  @Field(() => PaginationMetaType)
  meta: PaginationMetaType;
}
