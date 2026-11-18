export const createLoginServiceMock = () => ({
  signIn: jest.fn(),
  logout: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
});
