// common/types/audit-payload.types.ts
import type { AuditLog } from 'generated/prisma/client';
import type {
  User,
  Task,
  Status,
  Category,
  Comment,
  TaskRole,
  Workspace,
} from 'generated/prisma/client';

// Reusable snapshots
export type UserSnapshot = Pick<
  User,
  | 'id'
  | 'name'
  | 'firstSurname'
  | 'secondSurname'
  | 'documentType'
  | 'documentNumber'
  | 'code'
  | 'email'
  | 'phoneNumber'
  | 'phoneCountryCode'
  | 'source'
>;
export type UserMinimalSnapshot = Pick<
  User,
  'id' | 'email' | 'code' | 'name' | 'firstSurname' | 'secondSurname'
>;

type TaskSnapshot = Pick<Task, 'id' | 'title' | 'description' | 'dueDate'> & {
  status: StatusSnapshot | null;
  category: CategorySnapshot | null;
};
type TaskAssignedSnapshot = {
  task: TaskSnapshot;
  assignedUser: UserMinimalSnapshot;
  role: TaskRoleMinimalSnapshot;
};
type TaskUnassignedSnapshot = {
  task: TaskSnapshot;
  unassignedUser: UserMinimalSnapshot;
  role: TaskRoleMinimalSnapshot;
};

export type WorkspaceSnapshot = Pick<
  Workspace,
  'id' | 'name' | 'code' | 'taskPrefix' | 'description' | 'isDefault' | 'ownerId'
>;

export type TaskRoleSnapshot = Pick<TaskRole, 'id' | 'name' | 'description' | 'permissions'>;
type TaskRoleMinimalSnapshot = Pick<TaskRole, 'id' | 'name'>;

type StatusSnapshot = Pick<Status, 'id' | 'name' | 'color'>;

type CategorySnapshot = Pick<Category, 'id' | 'name' | 'color'>;

type CommentSnapshot = Pick<Comment, 'id' | 'content' | 'taskId' | 'edited' | 'active'>;

export type AuditChangeMap = {
  // Login actions — minimal info is enough
  LOGIN_USER: { before: null; after: UserMinimalSnapshot };
  LOGOUT_USER: { before: UserMinimalSnapshot; after: null };
  RECOVER_PASSWORD: { before: UserMinimalSnapshot; after: UserMinimalSnapshot };
  CHANGE_PASSWORD: { before: UserMinimalSnapshot; after: UserMinimalSnapshot };

  // User actions — full snapshot
  REGISTER_USER: { before: null; after: UserSnapshot };
  INACTIVATE_USER: { before: UserSnapshot; after: null };
  REACTIVATE_USER: { before: null; after: UserSnapshot };
  RELEASE_USER: { before: UserSnapshot; after: null };

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

  // Workspace actions
  CREATE_WORKSPACE: { before: null; after: WorkspaceSnapshot };

  // Task role actions
  CREATE_TASK_ROLE: { before: null; after: TaskRoleSnapshot };
  UPDATE_TASK_ROLE: { before: TaskRoleSnapshot; after: TaskRoleSnapshot };
  DELETE_TASK_ROLE: { before: TaskRoleSnapshot; after: null };
};

export type EmitAuditLogInput<A extends keyof AuditChangeMap> = {
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
