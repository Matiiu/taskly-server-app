import { Logger } from '@nestjs/common';

import { StatusesListener } from '@/statuses/statuses.listener';
import { StatusesService } from '@/statuses/statuses.service';

const WORKSPACE_ID = 'workspace-id-1';

describe('StatusesListener', () => {
  let listener: StatusesListener;
  let statusesService: { createDefaultStatuses: jest.Mock };

  beforeEach(() => {
    statusesService = { createDefaultStatuses: jest.fn() };
    listener = new StatusesListener(statusesService as unknown as StatusesService);
  });

  it('creates the default statuses of the new workspace', async () => {
    statusesService.createDefaultStatuses.mockResolvedValue(true);

    await listener.handleWorkspaceCreated({ workspaceId: WORKSPACE_ID });

    expect(statusesService.createDefaultStatuses).toHaveBeenCalledWith(WORKSPACE_ID);
  });

  it('logs and swallows a failure so it never reaches the request', async () => {
    const boom = new Error('db down');
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    statusesService.createDefaultStatuses.mockRejectedValue(boom);

    await expect(listener.handleWorkspaceCreated({ workspaceId: WORKSPACE_ID })).resolves.toBe(
      undefined,
    );
    expect(errorSpy).toHaveBeenCalledWith(
      `Failed to create default statuses for workspace ${WORKSPACE_ID}`,
      boom,
    );
    errorSpy.mockRestore();
  });
});
