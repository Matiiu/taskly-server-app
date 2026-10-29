export const createAccountServiceMock = () => ({
  deleteAccount: jest.fn(),
  recoverAccount: jest.fn(),
  changeCode: jest.fn(),
});
