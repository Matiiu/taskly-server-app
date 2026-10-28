import { AuthProvider, DocumentType, type User } from 'generated/prisma/client';
import type { SafeUser } from '@/users/types/users.type';

export const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-id-1',
  name: 'John',
  firstSurname: 'Doe',
  secondSurname: null,
  role: 'USER',
  documentType: DocumentType.DNI,
  documentNumber: '123456789',
  email: 'john@example.com',
  password: 'hashed-password',
  code: '@johndoe',
  phoneNumber: null,
  phoneCountryCode: null,
  source: AuthProvider.LOCAL,
  active: true,
  sessionsRevokedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

/** A user as UsersRepository/AuthRepository reads it: without the password. */
export const buildSafeUser = (overrides: Partial<SafeUser> = {}): SafeUser => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, ...user } = buildUser(overrides);
  return user;
};

export const buildUserType = (user: SafeUser) => ({
  id: user.id,
  name: user.name,
  firstSurname: user.firstSurname,
  secondSurname: user.secondSurname,
  documentType: user.documentType,
  documentNumber: user.documentNumber,
  role: user.role,
  email: user.email,
  code: user.code,
  phoneNumber: user.phoneNumber,
  phoneCountryCode: user.phoneCountryCode,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
