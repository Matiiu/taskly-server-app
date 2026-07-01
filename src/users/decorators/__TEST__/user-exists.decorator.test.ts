import {
  UserExists,
  USER_EXISTS_OPTIONS,
  UserExistsOptions,
} from '@/users/decorators/user-exists.decorator';

describe('UserExists decorator', () => {
  const applyToMethod = (options?: UserExistsOptions): UserExistsOptions => {
    const handler = () => {};
    UserExists(options)({}, 'method', { value: handler } as PropertyDescriptor);
    return Reflect.getMetadata(USER_EXISTS_OPTIONS, handler) as UserExistsOptions;
  };

  it('sets empty options when called with no arguments', () => {
    expect(applyToMethod()).toEqual({});
  });

  it('sets by=authSub', () => {
    expect(applyToMethod({ by: 'authSub' })).toEqual({ by: 'authSub' });
  });

  it('sets by=id', () => {
    expect(applyToMethod({ by: 'id' })).toEqual({ by: 'id' });
  });

  it('sets by=code', () => {
    expect(applyToMethod({ by: 'code' })).toEqual({ by: 'code' });
  });

  it('sets by=documentNumber', () => {
    expect(applyToMethod({ by: 'documentNumber' })).toEqual({ by: 'documentNumber' });
  });

  it('sets custom arg name', () => {
    expect(applyToMethod({ arg: 'userId' })).toEqual({ arg: 'userId' });
  });

  it('sets requireActive=false', () => {
    expect(applyToMethod({ requireActive: false })).toEqual({ requireActive: false });
  });

  it('sets all options together', () => {
    const options: UserExistsOptions = { by: 'code', arg: 'userCode', requireActive: true };
    expect(applyToMethod(options)).toEqual(options);
  });
});
