import {
  CategoryExists,
  CATEGORY_EXISTS_OPTIONS,
  CategoryExistsOptions,
} from '@/categories/decorators/category-exists.decorator';

describe('CategoryExists decorator', () => {
  const applyToMethod = (options?: CategoryExistsOptions): CategoryExistsOptions => {
    const handler = () => {};
    CategoryExists(options)({}, 'method', { value: handler } as PropertyDescriptor);
    return Reflect.getMetadata(CATEGORY_EXISTS_OPTIONS, handler) as CategoryExistsOptions;
  };

  it('sets empty options when called with no arguments', () => {
    expect(applyToMethod()).toEqual({});
  });

  it('sets by=id', () => {
    expect(applyToMethod({ by: 'id' })).toEqual({ by: 'id' });
  });

  it('sets custom arg name', () => {
    expect(applyToMethod({ arg: 'categoryId' })).toEqual({ arg: 'categoryId' });
  });

  it('sets all options together', () => {
    const options: CategoryExistsOptions = { by: 'id', arg: 'categoryId' };
    expect(applyToMethod(options)).toEqual(options);
  });
});
