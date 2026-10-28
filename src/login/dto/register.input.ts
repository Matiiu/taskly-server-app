import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { DocumentType } from 'generated/prisma/enums';
import {
  MIN_CODE_LENGTH,
  MAX_CODE_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from '@/login/constants/login.constant';
import {
  NormalizeName,
  TrimToNull,
  Trim,
  ToLowerCase,
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
  @Trim()
  email: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
  })
  @MaxLength(MAX_PASSWORD_LENGTH, {
    message: `password must be at most ${MAX_PASSWORD_LENGTH} characters long`,
  })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
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
  @MinLength(MIN_CODE_LENGTH, {
    message: `code must be at least ${MIN_CODE_LENGTH} characters long`,
  })
  @MaxLength(MAX_CODE_LENGTH, {
    message: `code must be at most ${MAX_CODE_LENGTH} characters long`,
  })
  @Matches(/^@[A-Za-z0-9_]+$/, {
    message: 'code must start with @ and contain only letters, numbers, and _',
  })
  @IsString()
  @IsNotEmpty()
  @ToLowerCase()
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
