import { SetMetadata } from '@nestjs/common';

export type TaskLookupBy = 'id';

export type TaskExistsOptions = {
  by?: TaskLookupBy;
  arg?: string;
  requireActive?: boolean;
};

export const TASK_EXISTS_OPTIONS = 'task_exists_options';

export const TaskExists = (options: TaskExistsOptions = {}) =>
  SetMetadata(TASK_EXISTS_OPTIONS, options);
