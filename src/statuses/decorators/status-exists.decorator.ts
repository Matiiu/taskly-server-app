import { SetMetadata } from '@nestjs/common';

export type StatusLookupBy = 'id';

export type StatusExistsOptions = {
  by?: StatusLookupBy;
  arg?: string;
};

export const STATUS_EXISTS_OPTIONS = 'status_exists_options';

export const StatusExists = (options: StatusExistsOptions = {}) =>
  SetMetadata(STATUS_EXISTS_OPTIONS, options);
