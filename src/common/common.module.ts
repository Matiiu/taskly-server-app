import { Global, Module } from '@nestjs/common';

import { AppEventEmitterService } from '@/common/event-emitter.service';

@Global()
@Module({
  providers: [AppEventEmitterService],
  exports: [AppEventEmitterService],
})
export class CommonModule {}
