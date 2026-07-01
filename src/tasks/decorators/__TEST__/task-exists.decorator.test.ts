import {
  TaskExists,
  TASK_EXISTS_OPTIONS,
  TaskExistsOptions,
} from '@/tasks/decorators/task-exists.decorator';

describe('TaskExists decorator', () => {
  const applyToMethod = (options?: TaskExistsOptions): TaskExistsOptions => {
    const handler = () => {};
    TaskExists(options)({}, 'method', { value: handler } as PropertyDescriptor);
    return Reflect.getMetadata(TASK_EXISTS_OPTIONS, handler) as TaskExistsOptions;
  };

  it('sets empty options when called with no arguments', () => {
    expect(applyToMethod()).toEqual({});
  });

  it('sets by=id', () => {
    expect(applyToMethod({ by: 'id' })).toEqual({ by: 'id' });
  });

  it('sets custom arg name', () => {
    expect(applyToMethod({ arg: 'taskId' })).toEqual({ arg: 'taskId' });
  });

  it('sets requireActive=false', () => {
    expect(applyToMethod({ requireActive: false })).toEqual({ requireActive: false });
  });

  it('sets ownerOnly=false', () => {
    expect(applyToMethod({ ownerOnly: false })).toEqual({ ownerOnly: false });
  });

  it('sets all options together', () => {
    const options: TaskExistsOptions = { by: 'id', arg: 'taskId', requireActive: false, ownerOnly: false };
    expect(applyToMethod(options)).toEqual(options);
  });
});
