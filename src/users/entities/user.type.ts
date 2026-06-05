import { ObjectType, Field, ID } from '@nestjs/graphql';
import type { User } from 'generated/prisma/client';
import { DocumentType } from 'generated/prisma/enums';

@ObjectType()
export class UserType implements Partial<User> {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  lastName: string;

  @Field(() => DocumentType)
  documentType: DocumentType;

  @Field(() => String)
  documentNumber: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  code: string;

  @Field(() => String, { nullable: true })
  phoneNumber: string | null;

  @Field(() => String, { nullable: true })
  phoneCountryCode: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
