import type { User, Workspace } from 'generated/prisma/client';

/** Emitted after a workspace is committed; listeners seed its defaults in the background. */
export type WorkspaceCreatedEvent = { workspaceId: Workspace['id'] };

/** Emitted after a reset token is saved; a listener emails the link in the background. */
export type PasswordResetRequestedEvent = {
  email: User['email'];
  name: User['name'];
  /** The raw token: it only travels in memory and in the email, never to the database. */
  token: string;
};
