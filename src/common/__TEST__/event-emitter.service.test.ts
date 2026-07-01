import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { AppEventEmitterService } from '@/common/event-emitter.service';
import { EVENTS } from '@/common/constants/events.constant';
import { EmitAuditLogInput } from '../types/audit-payload.types';

describe('AppEventEmitterService', () => {
  let service: AppEventEmitterService;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AppEventEmitterService, { provide: EventEmitter2, useValue: eventEmitter }],
    }).compile();

    service = module.get<AppEventEmitterService>(AppEventEmitterService);
  });

  describe('emit', () => {
    it('delegates to the underlying EventEmitter2', () => {
      service.emit('some.event', { data: 'value' });

      expect(eventEmitter.emit).toHaveBeenCalledWith('some.event', { data: 'value' });
    });
  });

  describe('emitAuditLog', () => {
    it('emits on the AUDIT_LOG event channel', () => {
      const input = {
        userId: 'user-1',
        action: 'CREATE_TASK' as never,
        entityId: 'e1',
        entity: 'Task' as never,
        description: 'Task created',
      };

      service.emitAuditLog(input);

      expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.AUDIT_LOG, input);
    });
  });
});
