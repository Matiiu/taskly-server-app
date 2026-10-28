import { registerEnumType } from '@nestjs/graphql';
import {
  DocumentType,
  AuditAction,
  AuditEntity,
  AuthProvider,
  UserRole,
  TaskPermission,
} from 'generated/prisma/enums';
import { SortOrder } from '@/common/enums/pagination.enum';
import { TaskRelation } from '@/tasks/enums/task-relation.enums';

registerEnumType(DocumentType, { name: 'DocumentType' });
registerEnumType(AuditAction, { name: 'AuditAction' });
registerEnumType(AuditEntity, { name: 'AuditEntity' });
registerEnumType(UserRole, { name: 'UserRole' });
registerEnumType(AuthProvider, { name: 'AuthProvider' });
registerEnumType(SortOrder, { name: 'SortOrder' });
registerEnumType(TaskRelation, { name: 'TaskRelation' });
registerEnumType(TaskPermission, { name: 'TaskPermission' });
