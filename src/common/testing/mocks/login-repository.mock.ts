export const createLoginRepositoryMock = () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  updatePassword: jest.fn(),
});
