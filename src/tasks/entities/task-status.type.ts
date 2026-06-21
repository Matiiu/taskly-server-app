import { Field, ObjectType } from '@nestjs/graphql';

import type { Status } from 'generated/prisma/client';

@ObjectType()
export class TaskStatusType implements Partial<Status> {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  color: string | null;
}
