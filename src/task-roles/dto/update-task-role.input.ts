import { InputType, PartialType } from '@nestjs/graphql';

import { CreateTaskRoleInput } from '@/task-roles/dto/create-task-role.input';

@InputType()
export class UpdateTaskRoleInput extends PartialType(CreateTaskRoleInput) {}
