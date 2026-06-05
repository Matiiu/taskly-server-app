import { registerEnumType } from '@nestjs/graphql';
import { DocumentType, AuditAction, AuditEntity, AuthProvider } from 'generated/prisma/enums';

registerEnumType(DocumentType, { name: 'DocumentType' });
registerEnumType(AuditAction, { name: 'AuditAction' });
registerEnumType(AuditEntity, { name: 'AuditEntity' });
registerEnumType(AuthProvider, { name: 'AuthProvider' });
