import { Field, InputType } from '@nestjs/graphql';

import { TaskRelation } from '@/tasks/enums/task-relation.enums';
import { IsOptional } from 'class-validator';

@InputType()
export class TasksFiltersInput {
  @Field(() => [TaskRelation], { nullable: true })
  @IsOptional()
  relations?: TaskRelation[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  search?: string | null;
}
