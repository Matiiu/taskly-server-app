/*
  Warnings:

  - The values [CREATE_CATEGORY,CREATE_STATUS] on the enum `AuditAction` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('REGISTER_USER', 'LOGIN_USER', 'LOGOUT_USER', 'RECOVER_PASSWORD', 'CHANGE_PASSWORD', 'UPDATE_USER', 'INACTIVATE_USER', 'CREATE_TASK', 'UPDATE_TASK', 'INACTIVATE_TASK', 'UPDATE_COLOR_CATEGORY', 'DELETE_CATEGORY', 'ASSIGN_TASK', 'UNASSIGN_TASK', 'UPDATE_COLOR_STATUS', 'DELETE_STATUS');
ALTER TABLE "AuditLog" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;
