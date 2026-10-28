import { ObjectType, Field } from '@nestjs/graphql';

import { StatusType } from '@/statuses/entities/status.type';
import { MutationResponseType } from '@/common/entities/mutation-response.type';

@ObjectType()
export class StatusActionType extends MutationResponseType {
  @Field(() => StatusType)
  status: StatusType;
}
