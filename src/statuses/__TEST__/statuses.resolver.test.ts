import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/login/guards/jwt-auth.guard';
import { PolicyGuard } from '@/authorization/guards/policy.guard';
import { StatusesResolver } from '@/statuses/statuses.resolver';
import { StatusesService } from '@/statuses/statuses.service';
import { buildStatus } from '@/common/testing/factories/domain.factory';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';
import { createStatusesServiceMock } from '@/common/testing/mocks/statuses-service.mock';

const WORKSPACE_ID = 'workspace-id-1';
const USER_ID = 'user-id-1';

describe('StatusesResolver', () => {
  let resolver: StatusesResolver;
  let statusesServiceMock: ReturnType<typeof createStatusesServiceMock>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    statusesServiceMock = createStatusesServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [StatusesResolver, { provide: StatusesService, useValue: statusesServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PolicyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<StatusesResolver>(StatusesResolver);
  });

  it('findMany delegates to service with the workspace, pagination and search', async () => {
    const status = buildStatus();
    const pagination = { page: 1, limit: 10 };
    const expected = { statuses: [status], meta: createPaginationMetaMock() };
    statusesServiceMock.findMany.mockResolvedValue(expected);

    const result = await resolver.findMany(WORKSPACE_ID, pagination, 'done');

    expect(result).toEqual(expected);
    expect(statusesServiceMock.findMany).toHaveBeenCalledWith(WORKSPACE_ID, pagination, 'done');
  });

  it('findMany passes null when there is no search', async () => {
    statusesServiceMock.findMany.mockResolvedValue({
      statuses: [],
      meta: createPaginationMetaMock(),
    });

    await resolver.findMany(WORKSPACE_ID);

    expect(statusesServiceMock.findMany).toHaveBeenCalledWith(WORKSPACE_ID, undefined, null);
  });

  it('findOne delegates to service', async () => {
    const status = buildStatus();
    statusesServiceMock.findOne.mockResolvedValue(status);

    const result = await resolver.findOne(WORKSPACE_ID, status.id);

    expect(result).toBe(status);
    expect(statusesServiceMock.findOne).toHaveBeenCalledWith(WORKSPACE_ID, status.id);
  });

  it('updateColor returns formatted action message', async () => {
    const status = buildStatus({ name: 'Done', color: '#22c55e' });
    statusesServiceMock.updateColor.mockResolvedValue(status);

    const result = await resolver.updateColor(USER_ID, WORKSPACE_ID, status.id, {
      color: '#22c55e',
    });

    expect(result).toEqual({
      message: `Status ${status.name} color updated successfully`,
      status,
    });
    expect(statusesServiceMock.updateColor).toHaveBeenCalledWith(WORKSPACE_ID, USER_ID, status.id, {
      color: '#22c55e',
    });
  });

  it('remove returns formatted action message', async () => {
    const status = buildStatus({ name: 'Archived' });
    statusesServiceMock.remove.mockResolvedValue(status);

    const result = await resolver.remove(USER_ID, WORKSPACE_ID, status.id);

    expect(result).toEqual({
      message: `Status ${status.name} removed successfully`,
      status,
    });
    expect(statusesServiceMock.remove).toHaveBeenCalledWith(WORKSPACE_ID, USER_ID, status.id);
  });

  it('propagates service errors', async () => {
    const boom = new InternalServerErrorException('status update failed');
    statusesServiceMock.updateColor.mockRejectedValue(boom);

    await expect(
      resolver.updateColor(USER_ID, WORKSPACE_ID, 'status-id-1', { color: '#ef4444' }),
    ).rejects.toBe(boom);
  });
});
