export const createLoginRepositoryMock = () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  updatePassword: jest.fn(),
  createResetToken: jest.fn(),
  findActiveResetToken: jest.fn(),
  markResetTokenUsed: jest.fn(),
  invalidateResetTokens: jest.fn(),
});
