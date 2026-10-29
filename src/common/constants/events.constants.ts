export const EVENTS = {
  AUDIT_LOG: 'audit.log',
  WORKSPACE_CREATED: 'workspace.created',
} as const;

export type EVENTS = (typeof EVENTS)[keyof typeof EVENTS];
