export const COLORS = {
  // Base palette
  ORANGE: '#FFA500',
  BLUE: '#1E90FF',
  GREEN: '#32CD32',
  GRAY: '#808080',

  // Semantic aliases
  STATUS_PENDING: '#FFA500',
  STATUS_IN_PROGRESS: '#1E90FF',
  STATUS_DONE: '#32CD32',
  DEFAULT_INITIAL: '#808080',
} as const;

export type StatusColor = (typeof COLORS)[keyof typeof COLORS];

export const DEFAULT_STATUSES = [
  { name: 'Pending', color: COLORS.STATUS_PENDING },
  { name: 'In Progress', color: COLORS.STATUS_IN_PROGRESS },
  { name: 'Done', color: COLORS.STATUS_DONE },
] as const;
