import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

import type { Status } from 'generated/prisma/client';

@InputType()
export class UpdateStatusColorInput implements Pick<Status, 'color'> {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.trim())
  color: Status['color'];
}
