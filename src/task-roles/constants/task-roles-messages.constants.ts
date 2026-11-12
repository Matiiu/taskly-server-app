/** Success messages returned by the task roles mutations. */
export const TASK_ROLE_MESSAGES = {
  CREATED: (name: string) => `Task role ${name} created successfully`,
  UPDATED: (name: string) => `Task role ${name} updated successfully`,
  REMOVED: (name: string) => `Task role ${name} removed successfully`,
} as const;
