export const createUsersServiceMock = () => ({
  findMany: jest.fn(),
  findByCode: jest.fn(),
  findByIdOrThrow: jest.fn(),
  update: jest.fn(),
  assertDocumentAvailable: jest.fn(),
  toUserType: jest.fn(),
});
