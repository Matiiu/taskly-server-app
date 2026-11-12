/** Success messages returned by the categories mutations. */
export const CATEGORY_MESSAGES = {
  COLOR_UPDATED: (name: string) => `Category ${name} color updated successfully`,
  REMOVED: (name: string) => `Category ${name} removed successfully`,
} as const;
