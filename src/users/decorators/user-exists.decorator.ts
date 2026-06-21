import { SetMetadata } from '@nestjs/common';

export type UserLookupBy = 'authSub' | 'id' | 'code' | 'documentNumber';

export type UserExistsOptions = {
  by?: UserLookupBy;
  arg?: string;
  requireActive?: boolean;
};

export const USER_EXISTS_OPTIONS = 'user_exists_options';

export const UserExists = (options: UserExistsOptions = {}) =>
  SetMetadata(USER_EXISTS_OPTIONS, options);
