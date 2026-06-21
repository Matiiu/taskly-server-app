import { SetMetadata } from '@nestjs/common';

export type CategoryLookupBy = 'id';

export type CategoryExistsOptions = {
  by?: CategoryLookupBy;
  arg?: string;
};

export const CATEGORY_EXISTS_OPTIONS = 'category_exists_options';

export const CategoryExists = (options: CategoryExistsOptions = {}) =>
  SetMetadata(CATEGORY_EXISTS_OPTIONS, options);
