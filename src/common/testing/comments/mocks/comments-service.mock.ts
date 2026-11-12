export const createCommentsServiceMock = () => ({
  findManyByTask: jest.fn(),
  findManyRepliesByComment: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createReply: jest.fn(),
  updateReply: jest.fn(),
  removeReply: jest.fn(),
});
