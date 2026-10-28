import type { UserMinimalSnapshot, UserSnapshot } from '@/common/types/audit-payload.types';
import type { SafeUser } from '@/users/types/users.type';

export function toUserSnapshot(user: SafeUser): UserSnapshot {
  return {
    id: user.id,
    name: user.name,
    firstSurname: user.firstSurname,
    secondSurname: user.secondSurname,
    documentType: user.documentType,
    documentNumber: user.documentNumber,
    code: user.code,
    email: user.email,
    phoneNumber: user.phoneNumber,
    phoneCountryCode: user.phoneCountryCode,
    source: user.source,
  };
}

export function toUserMinimalSnapshot(user: SafeUser): UserMinimalSnapshot {
  return {
    id: user.id,
    email: user.email,
    code: user.code,
    name: user.name,
    firstSurname: user.firstSurname,
    secondSurname: user.secondSurname,
  };
}
