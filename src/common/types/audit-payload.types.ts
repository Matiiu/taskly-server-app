// common/types/audit-payload.types.ts
import type { AuditAction, AuditLog } from 'generated/prisma/client';
import type { User, Task, Status, Category, Comment } from 'generated/prisma/client';

// Reusable snapshots
type UserSnapshot = Pick<
  User,
  | 'id'
  | 'name'
  | 'lastName'
  | 'documentType'
  | 'documentNumber'
  | 'code'
  | 'email'
  | 'phoneNumber'
  | 'phoneCountryCode'
  | 'source'
>;
type UserMinimalSnapshot = Pick<User, 'id' | 'email' | 'code' | 'name' | 'lastName'>;

type TaskSnapshot = Pick<Task, 'id' | 'title' | 'description' | 'dueDate'> & {
  status: StatusSnapshot | null;
  category: CategorySnapshot | null;
};
type TaskAssignedSnapshot = { task: TaskSnapshot; assignedUser: UserMinimalSnapshot };
type TaskUnassignedSnapshot = { task: TaskSnapshot; unassignedUser: UserMinimalSnapshot };

type StatusSnapshot = Pick<Status, 'id' | 'name' | 'color'>;

type CategorySnapshot = Pick<Category, 'id' | 'name' | 'color'>;

type CommentSnapshot = Pick<Comment, 'id' | 'content' | 'taskId' | 'edited' | 'active'>;

export type AuditChangeMap = {
  // Auth actions — minimal info is enough
  LOGIN_USER: { before: null; after: UserMinimalSnapshot };
  LOGOUT_USER: { before: UserMinimalSnapshot; after: null };
  RECOVER_PASSWORD: { before: UserMinimalSnapshot; after: UserMinimalSnapshot };
  CHANGE_PASSWORD: { before: UserMinimalSnapshot; after: UserMinimalSnapshot };

  // User actions — full snapshot
  REGISTER_USER: { before: null; after: UserSnapshot };
  INACTIVATE_USER: { before: UserSnapshot; after: null };

  // User Update — before & after
  UPDATE_USER: { before: UserSnapshot; after: UserSnapshot };

  // Task actions - full snapshot
  CREATE_TASK: { before: null; after: TaskSnapshot };
  INACTIVATE_TASK: { before: TaskSnapshot; after: TaskSnapshot };
  UPDATE_TASK: { before: TaskSnapshot; after: TaskSnapshot };

  // Comment actions
  CREATE_COMMENT: { before: null; after: CommentSnapshot };
  UPDATE_COMMENT: { before: CommentSnapshot; after: CommentSnapshot };
  INACTIVATE_COMMENT: { before: CommentSnapshot; after: CommentSnapshot };

  // Task assignee actions
  ASSIGN_TASK: { before: null; after: TaskAssignedSnapshot };
  UNASSIGN_TASK: { before: TaskUnassignedSnapshot; after: null };

  // Status actions
  UPDATE_COLOR_STATUS: { before: StatusSnapshot | null; after: StatusSnapshot };
  DELETE_STATUS: { before: StatusSnapshot; after: null };

  // Category actions
  UPDATE_COLOR_CATEGORY: { before: CategorySnapshot | null; after: CategorySnapshot };
  DELETE_CATEGORY: { before: CategorySnapshot; after: null };
};

export type EmitAuditLogInput<A extends AuditAction> = {
  userId: AuditLog['userId'];
  action: A;
  entityId: AuditLog['entityId'];
  entity: AuditLog['entity'];
  description?: AuditLog['description'];
  before?: AuditChangeMap[A]['before'];
  after?: AuditChangeMap[A]['after'];
  ipAddress?: AuditLog['ipAddress'];
  userAgent?: AuditLog['userAgent'];
};
