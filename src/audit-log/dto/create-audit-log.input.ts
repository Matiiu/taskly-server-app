import { InputType, Field } from '@nestjs/graphql';

import type { AuditLog } from 'generated/prisma/client';
import { AuditAction, AuditEntity } from 'generated/prisma/enums';

type TCreateAuditLogInput = Pick<
  AuditLog,
  'userId' | 'action' | 'entityId' | 'entity' | 'after' | 'before'
> & {
  description?: AuditLog['description'];
  ipAddress?: AuditLog['ipAddress'];
  userAgent?: AuditLog['userAgent'];
};

@InputType()
export class CreateAuditLogInput implements TCreateAuditLogInput {
  @Field(() => String)
  userId: AuditLog['userId'];

  @Field(() => AuditAction)
  action: AuditLog['action'];

  @Field(() => String)
  entityId: AuditLog['entityId'];

  @Field(() => AuditEntity)
  entity: AuditLog['entity'];

  @Field(() => String, { nullable: true })
  description?: AuditLog['description'];

  @Field(() => String)
  before: AuditLog['before'];

  @Field(() => String)
  after: AuditLog['after'];

  @Field(() => String, { nullable: true })
  ipAddress?: AuditLog['ipAddress'];

  @Field(() => String, { nullable: true })
  userAgent?: AuditLog['userAgent'];
}
