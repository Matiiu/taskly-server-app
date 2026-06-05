import { ObjectType, Field } from '@nestjs/graphql';

import type { Status } from 'generated/prisma/client';

@ObjectType()
export class StatusType implements Partial<Status> {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  color: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
