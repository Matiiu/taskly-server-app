import type { Workspace } from 'generated/prisma/client';

/** Emitted after a workspace is committed; listeners seed its defaults in the background. */
export type WorkspaceCreatedEvent = { workspaceId: Workspace['id'] };
