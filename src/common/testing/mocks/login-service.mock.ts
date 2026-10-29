export const createLoginServiceMock = () => ({
  signIn: jest.fn(),
  logout: jest.fn(),
  recoverPassword: jest.fn(),
});
