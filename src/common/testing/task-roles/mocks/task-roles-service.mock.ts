export const createTaskRolesServiceMock = () => ({
  createDefaultTaskRoles: jest.fn(),
  findMany: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findInWorkspaceOrThrow: jest.fn(),
  toTaskRoleType: jest.fn(),
});
