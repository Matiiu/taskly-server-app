export const createUsersServiceMock = () => ({
  findMany: jest.fn(),
  findByCode: jest.fn(),
  update: jest.fn(),
  createResponse: jest.fn(),
});
