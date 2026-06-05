/*
  Warnings:

  - The values [INACTIVATE_CATEGORY,INACTIVATE_STATUS] on the enum `AuditAction` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `active` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `Status` table. All the data in the column will be lost.
  - Made the column `userId` on table `Task` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditAction_new" AS ENUM ('REGISTER_USER', 'LOGIN_USER', 'LOGOUT_USER', 'RECOVER_PASSWORD', 'CHANGE_PASSWORD', 'UPDATE_USER', 'INACTIVATE_USER', 'CREATE_TASK', 'UPDATE_TASK', 'INACTIVATE_TASK', 'CREATE_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY', 'ASSIGN_TASK', 'UNASSIGN_TASK', 'CREATE_STATUS', 'UPDATE_STATUS', 'DELETE_STATUS');
ALTER TABLE "AuditLog" ALTER COLUMN "action" TYPE "AuditAction_new" USING ("action"::text::"AuditAction_new");
ALTER TYPE "AuditAction" RENAME TO "AuditAction_old";
ALTER TYPE "AuditAction_new" RENAME TO "AuditAction";
DROP TYPE "public"."AuditAction_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_userId_fkey";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "active";

-- AlterTable
ALTER TABLE "Status" DROP COLUMN "active";

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
