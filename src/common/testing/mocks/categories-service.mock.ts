export const createCategoriesServiceMock = () => ({
  findMany: jest.fn(),
  findByIdOrNameOrCreate: jest.fn(),
  updateColor: jest.fn(),
  remove: jest.fn(),
});
