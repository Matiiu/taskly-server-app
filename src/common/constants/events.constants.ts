export const EVENTS = {
  AUDIT_LOG: 'audit.log',
  WORKSPACE_CREATED: 'workspace.created',
  PASSWORD_RESET_REQUESTED: 'password-reset.requested',
} as const;

export type EVENTS = (typeof EVENTS)[keyof typeof EVENTS];
