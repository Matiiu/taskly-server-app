export const EVENTS = {
  AUDIT_LOG: 'audit.log',
  STATUS_CHANGED: 'status.changed',
} as const;

export type EVENTS = (typeof EVENTS)[keyof typeof EVENTS];
