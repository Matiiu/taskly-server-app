import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { StatusesResolver } from '@/statuses/statuses.resolver';
import { StatusesService } from '@/statuses/statuses.service';
import { StatusExistsGuard } from '@/statuses/guards/status-exists.guard';
import { buildStatus } from '@/common/testing/factories/domain.factory';
import { createPaginationMetaMock } from '@/common/testing/mocks/pagination.mock';
import { createStatusesServiceMock } from '@/common/testing/mocks/statuses-service.mock';

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
      .overrideGuard(StatusExistsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<StatusesResolver>(StatusesResolver);
  });

  it('findMyStatuses delegates to service', async () => {
    const status = buildStatus();
    const pagination = { page: 1, limit: 10 };
    const expected = { statuses: [status], meta: createPaginationMetaMock() };
    statusesServiceMock.findMany.mockResolvedValue(expected);

    const result = await resolver.findMyStatuses('user-id-1', pagination);

    expect(result).toEqual(expected);
    expect(statusesServiceMock.findMany).toHaveBeenCalledWith('user-id-1', pagination);
  });

  it('findMyStatus delegates to service', async () => {
    const status = buildStatus();
    statusesServiceMock.findOne.mockResolvedValue(status);

    const result = await resolver.findMyStatus('user-id-1', status.id);

    expect(result).toBe(status);
    expect(statusesServiceMock.findOne).toHaveBeenCalledWith('user-id-1', status.id);
  });

  it('updateColor returns formatted action message', async () => {
    const status = buildStatus({ name: 'Done', color: '#22c55e' });
    statusesServiceMock.updateColor.mockResolvedValue(status);

    const result = await resolver.updateColor('user-id-1', status.id, { color: '#22c55e' });

    expect(result).toEqual({
      message: `Status ${status.name} color updated successfully`,
      status,
    });
    expect(statusesServiceMock.updateColor).toHaveBeenCalledWith('user-id-1', status.id, {
      color: '#22c55e',
    });
  });

  it('removeMyStatus returns formatted action message', async () => {
    const status = buildStatus({ name: 'Archived' });
    statusesServiceMock.remove.mockResolvedValue(status);

    const result = await resolver.removeMyStatus('user-id-1', status.id);

    expect(result).toEqual({
      message: `Status ${status.name} removed successfully`,
      status,
    });
    expect(statusesServiceMock.remove).toHaveBeenCalledWith('user-id-1', status.id);
  });

  it('propagates service errors', async () => {
    const boom = new InternalServerErrorException('status update failed');
    statusesServiceMock.updateColor.mockRejectedValue(boom);

    await expect(
      resolver.updateColor('user-id-1', 'status-id-1', { color: '#ef4444' }),
    ).rejects.toBe(boom);
  });
});
