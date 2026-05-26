import { Field, GraphQLISODateTime, Int, ObjectType } from '@nestjs/graphql';
import { Category } from '../../categories/entities/category.entity';
import { TaskStatus } from '../enums/task-status.enum';

@ObjectType()
export class Task {
  @Field(() => Int)
  id: number;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => TaskStatus)
  status: TaskStatus;

  @Field(() => GraphQLISODateTime, { nullable: true })
  dueDate?: Date;

  @Field(() => Int)
  categoryId: number;

  @Field(() => Category)
  category: Category;
}
