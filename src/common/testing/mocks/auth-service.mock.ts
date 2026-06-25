export const createAuthServiceMock = () => ({
  register: jest.fn(),
  signIn: jest.fn(),
  recoverPassword: jest.fn(),
  suggestCodes: jest.fn(),
  logout: jest.fn(),
});
