import type { TaskDetailType } from '@/tasks/entities/task-detail.type';

type TaskLabel = Pick<TaskDetailType, 'code' | 'title'>;

/** Success messages returned by the tasks mutations. */
export const TASK_MESSAGES = {
  CREATED: ({ title }: TaskLabel) => `Task ${title} created successfully`,
  UPDATED: ({ code, title }: TaskLabel) => `Task ${code} ${title} updated successfully`,
  STATUS_UPDATED: ({ code, title, status }: TaskLabel & Pick<TaskDetailType, 'status'>) =>
    `The status of task ${code} ${title} updated successfully to ${status?.name}`,
  CATEGORY_UPDATED: ({ code, title, category }: TaskLabel & Pick<TaskDetailType, 'category'>) =>
    `The category of task ${code} ${title} updated successfully to ${category?.name}`,
  REMOVED: ({ code, title }: TaskLabel) => `Task ${code} ${title} removed successfully`,
} as const;
