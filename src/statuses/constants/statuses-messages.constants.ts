/** Success messages returned by the statuses mutations. */
export const STATUS_MESSAGES = {
  COLOR_UPDATED: (name: string) => `Status ${name} color updated successfully`,
  REMOVED: (name: string) => `Status ${name} removed successfully`,
} as const;
