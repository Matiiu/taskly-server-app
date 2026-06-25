import { AuthProvider, DocumentType, type User } from 'generated/prisma/client';

export const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-id-1',
  name: 'John',
  lastName: 'Doe',
  documentType: DocumentType.DNI,
  documentNumber: '123456789',
  email: 'john@example.com',
  password: 'hashed-password',
  code: '@johndoe',
  phoneNumber: null,
  phoneCountryCode: null,
  source: AuthProvider.LOCAL,
  active: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const buildUserType = (user: User) => ({
  id: user.id,
  name: user.name,
  lastName: user.lastName,
  documentType: user.documentType,
  documentNumber: user.documentNumber,
  email: user.email,
  code: user.code,
  phoneNumber: user.phoneNumber,
  phoneCountryCode: user.phoneCountryCode,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
