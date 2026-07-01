export const createUsersServiceMock = () => ({
  findMany: jest.fn(),
  findByCode: jest.fn(),
  update: jest.fn(),
  toUserType: jest.fn(),
});
