/** Success messages returned by the task assignees mutations. */
export const TASK_ASSIGNEE_MESSAGES = {
  ADDED: (code: string) => `Assignee ${code} added successfully`,
  REMOVED: (code: string) => `Assignee ${code} removed successfully`,
} as const;
