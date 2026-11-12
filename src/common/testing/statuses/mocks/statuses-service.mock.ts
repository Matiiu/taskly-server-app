export const createStatusesServiceMock = () => ({
  createDefaultStatuses: jest.fn().mockResolvedValue(undefined),
  findMany: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  updateColor: jest.fn(),
  remove: jest.fn(),
});
