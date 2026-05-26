import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Task } from '../../tasks/entities/task.entity';

@ObjectType()
export class Category {
  @Field(() => Int)
  id: number;

  @Field()
  name: string;

  @Field()
  color: string;

  @Field(() => [Task], { defaultValue: [] })
  tasks: Task[];
}
