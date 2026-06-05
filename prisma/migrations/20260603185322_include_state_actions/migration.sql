/*
  Warnings:

  - The values [DELETE_TASK,DELETE_CATEGORY] on the enum `AuditAction` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('REGISTER_USER', 'LOGIN_USER', 'LOGOUT_USER', 'RECOVER_PASSWORD', 'CHANGE_PASSWORD', 'UPDATE_USER', 'INACTIVATE_USER', 'CREATE_TASK', 'UPDATE_TASK', 'INACTIVATE_TASK', 'CREATE_CATEGORY', 'UPDATE_CATEGORY', 'INACTIVATE_CATEGORY', 'ASSIGN_TASK', 'UNASSIGN_TASK', 'CREATE_STATUS', 'UPDATE_STATUS', 'INACTIVATE_STATUS');
ALTER TABLE "AuditLog" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;
