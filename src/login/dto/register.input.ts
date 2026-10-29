import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';
import { DocumentType } from 'generated/prisma/enums';
import { IsUserCode } from '@/users/decorators/is-user-code.decorator';
import { IsStrongPassword } from '@/login/decorators/is-strong-password.decorator';
import {
  NormalizeName,
  TrimToNull,
  Trim,
  TrimLowerCase,
} from '@/common/transforms/string.transforms';

@InputType()
export class RegisterInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @NormalizeName()
  name: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @NormalizeName()
  firstSurname: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @NormalizeName()
  secondSurname?: string | null;

  @Field(() => String)
  @IsNotEmpty()
  @IsEmail()
  @TrimLowerCase()
  email: string;

  @Field(() => String)
  @IsStrongPassword()
  password: string;

  @Field(() => DocumentType)
  @IsNotEmpty()
  @IsIn([...Object.values(DocumentType)], {
    message: `documentType is not valid`,
  })
  documentType: DocumentType;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Trim()
  documentNumber: string;

  @Field(() => String, { nullable: true })
  @IsUserCode()
  code: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @TrimToNull()
  phoneNumber?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @TrimToNull()
  phoneCountryCode?: string | null;
}
