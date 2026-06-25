export const createPrismaMock = () => ({
  $transaction: jest.fn((operations) => Promise.all(operations)),
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  revokedToken: {
    upsert: jest.fn(),
  },
});
