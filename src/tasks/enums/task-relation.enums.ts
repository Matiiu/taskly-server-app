export const TaskRelation = {
  CREATED: 'CREATED',
  ASSIGNED: 'ASSIGNED',
} as const;

export type TaskRelation = (typeof TaskRelation)[keyof typeof TaskRelation];
