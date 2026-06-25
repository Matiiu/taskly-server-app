export const createTasksServiceMock = () => ({
  create: jest.fn(),
  findMany: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  updateCategory: jest.fn(),
  remove: jest.fn(),
});
