import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmitAuditLogInput } from '@/common/types/audit-payload.types';

import type { AuditAction } from 'generated/prisma/client';
import { EVENTS } from '@/common/constants/events.constant';

@Injectable()
export class AppEventEmitterService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit<T>(event: string, payload: T): void {
    this.eventEmitter.emit(event, payload);
  }

  emitAuditLog<A extends AuditAction>(input: EmitAuditLogInput<A>): void {
    this.emit(EVENTS.AUDIT_LOG, input);
  }
}
