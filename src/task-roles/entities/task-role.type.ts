import { Field, ID, ObjectType } from '@nestjs/graphql';

import { TaskPermission } from 'generated/prisma/enums';
import type { TaskRole } from 'generated/prisma/client';

@ObjectType()
export class TaskRoleType implements Partial<TaskRole> {
  @Field(() => ID)
  id: TaskRole['id'];

  @Field(() => String)
  name: TaskRole['name'];

  @Field(() => String, { nullable: true })
  description: TaskRole['description'];

  @Field(() => [TaskPermission])
  permissions: TaskRole['permissions'];

  @Field(() => Boolean)
  isSystem: TaskRole['isSystem'];

  @Field(() => Date)
  createdAt: TaskRole['createdAt'];

  @Field(() => Date)
  updatedAt: TaskRole['updatedAt'];
}
