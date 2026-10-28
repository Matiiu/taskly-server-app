export const createLoginServiceMock = () => ({
  register: jest.fn(),
  signIn: jest.fn(),
  recoverPassword: jest.fn(),
  suggestCodes: jest.fn(),
  logout: jest.fn(),
  deleteAccount: jest.fn(),
  recoverAccount: jest.fn(),
});
