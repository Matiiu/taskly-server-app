import {
  StatusExists,
  STATUS_EXISTS_OPTIONS,
  StatusExistsOptions,
} from '@/statuses/decorators/status-exists.decorator';

describe('StatusExists decorator', () => {
  const applyToMethod = (options?: StatusExistsOptions): StatusExistsOptions => {
    const handler = () => {};
    StatusExists(options)({}, 'method', { value: handler } as PropertyDescriptor);
    return Reflect.getMetadata(STATUS_EXISTS_OPTIONS, handler) as StatusExistsOptions;
  };

  it('sets empty options when called with no arguments', () => {
    expect(applyToMethod()).toEqual({});
  });

  it('sets by=id', () => {
    expect(applyToMethod({ by: 'id' })).toEqual({ by: 'id' });
  });

  it('sets custom arg name', () => {
    expect(applyToMethod({ arg: 'statusId' })).toEqual({ arg: 'statusId' });
  });

  it('sets all options together', () => {
    const options: StatusExistsOptions = { by: 'id', arg: 'statusId' };
    expect(applyToMethod(options)).toEqual(options);
  });
});
