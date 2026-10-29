export const createUsersServiceMock = () => ({
  findMany: jest.fn(),
  findByCode: jest.fn(),
  findById: jest.fn(),
  findByIdOrThrow: jest.fn(),
  existsByCode: jest.fn(),
  create: jest.fn(),
  deactivate: jest.fn(),
  activate: jest.fn(),
  release: jest.fn(),
  update: jest.fn(),
  assertDocumentAvailable: jest.fn(),
  toUserType: jest.fn(),
});
