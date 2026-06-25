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
import type { User } from 'generated/prisma/client';
import {
  MIN_CODE_LENGTH,
  MAX_CODE_LENGTH,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from '@/auth/constants/auth.constant';
import { Transform } from 'class-transformer';

@InputType()
export class RegisterInput implements Partial<User> {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => {
    const trimmed = value.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  })
  name: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => {
    const trimmed = value.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  })
  lastName: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
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
    message: `documentType must be one of the following values: ${Object.values(DocumentType).join(', ')}`,
  })
  documentType: DocumentType;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
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
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.toLowerCase() ?? null)
  code?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  phoneCountryCode?: string | null;
}
