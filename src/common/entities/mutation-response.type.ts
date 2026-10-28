import { Field, ObjectType } from '@nestjs/graphql';

/**
 * Base for mutation payloads. Abstract, so it adds `message` to subclasses
 * without registering its own type in the schema.
 */
@ObjectType({ isAbstract: true })
export abstract class MutationResponseType {
  @Field(() => String)
  message: string;
}
