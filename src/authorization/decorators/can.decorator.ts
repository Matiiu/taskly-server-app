import { SetMetadata } from '@nestjs/common';
import type { PolicyAction } from '@/authorization/policies';

export const CAN_ACTION_KEY = 'can_action';
export const Can = (action: PolicyAction) => SetMetadata(CAN_ACTION_KEY, action);
