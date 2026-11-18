export const createAppEventEmitterMock = () => ({
  emit: jest.fn(),
  emitAuditLog: jest.fn(),
});
