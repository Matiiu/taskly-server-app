import { ObjectType, Field } from '@nestjs/graphql';

import { StatusType } from '@/statuses/entities/status.type';

@ObjectType()
export class StatusActionType {
  @Field(() => String)
  message: string;

  @Field(() => StatusType)
  status: StatusType;
}
