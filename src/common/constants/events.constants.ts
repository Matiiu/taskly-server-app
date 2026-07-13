export const EVENTS = {
  AUDIT_LOG: 'audit.log',
} as const;

export type EVENTS = (typeof EVENTS)[keyof typeof EVENTS];
