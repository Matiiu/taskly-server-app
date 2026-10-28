/*
  Warnings:

  - You are about to drop the column `userId` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Status` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Task` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[workspaceId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workspaceId,name]` on the table `Status` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[workspaceId,sequenceNumber]` on the table `Task` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `workspaceId` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `Status` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequenceNumber` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workspaceId` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `TaskAssignee` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkspacePermission" AS ENUM ('WORKSPACE_UPDATE', 'MEMBER_INVITE', 'MEMBER_REMOVE', 'ROLE_MANAGE', 'STATUS_MANAGE', 'CATEGORY_MANAGE', 'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_ASSIGN', 'COMMENT_CREATE', 'COMMENT_DELETE_ANY');

-- CreateEnum
CREATE TYPE "TaskPermission" AS ENUM ('TASK_UPDATE', 'TASK_CHANGE_STATUS', 'TASK_ASSIGN', 'COMMENT_CREATE', 'COMMENT_DELETE_ANY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CREATE_WORKSPACE';
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_WORKSPACE';
ALTER TYPE "AuditAction" ADD VALUE 'INACTIVATE_WORKSPACE';
ALTER TYPE "AuditAction" ADD VALUE 'ADD_WORKSPACE_MEMBER';
ALTER TYPE "AuditAction" ADD VALUE 'REMOVE_WORKSPACE_MEMBER';
ALTER TYPE "AuditAction" ADD VALUE 'CHANGE_WORKSPACE_ROLE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditEntity" ADD VALUE 'Workspace';
ALTER TYPE "AuditEntity" ADD VALUE 'WorkspaceMember';

-- DropForeignKey
ALTER TABLE "Category" DROP CONSTRAINT "Category_userId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommentReply" DROP CONSTRAINT "CommentReply_userId_fkey";

-- DropForeignKey
ALTER TABLE "Status" DROP CONSTRAINT "Status_userId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_userId_fkey";

-- DropIndex
DROP INDEX "Category_name_userId_key";

-- DropIndex
DROP INDEX "Category_userId_idx";

-- DropIndex
DROP INDEX "Comment_taskId_idx";

-- DropIndex
DROP INDEX "CommentReply_commentId_idx";

-- DropIndex
DROP INDEX "Status_name_userId_key";

-- DropIndex
DROP INDEX "Status_userId_idx";

-- DropIndex
DROP INDEX "Task_userId_idx";

-- DropIndex
DROP INDEX "TaskAssignee_taskId_idx";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "userId",
ADD COLUMN     "workspaceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Status" DROP COLUMN "userId",
ADD COLUMN     "workspaceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "userId",
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "sequenceNumber" INTEGER NOT NULL,
ADD COLUMN     "workspaceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TaskAssignee" ADD COLUMN     "assignedById" TEXT,
ADD COLUMN     "roleId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "taskPrefix" TEXT NOT NULL,
    "lastTaskSequence" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" "WorkspacePermission"[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "WorkspaceRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roleId" TEXT NOT NULL,
    "invitedById" TEXT,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId","userId")
);

-- CreateTable
CREATE TABLE "TaskRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" "TaskPermission"[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "TaskRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workspace_ownerId_active_idx" ON "Workspace"("ownerId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_ownerId_code_key" ON "Workspace"("ownerId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_ownerId_taskPrefix_key" ON "Workspace"("ownerId", "taskPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_ownerId_name_key" ON "Workspace"("ownerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceRole_workspaceId_name_key" ON "WorkspaceRole"("workspaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceRole_id_workspaceId_key" ON "WorkspaceRole"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_roleId_idx" ON "WorkspaceMember"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskRole_workspaceId_name_key" ON "TaskRole"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Category_workspaceId_createdAt_idx" ON "Category"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_workspaceId_name_key" ON "Category"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Comment_taskId_active_createdAt_idx" ON "Comment"("taskId", "active", "createdAt");

-- CreateIndex
CREATE INDEX "CommentReply_commentId_active_createdAt_idx" ON "CommentReply"("commentId", "active", "createdAt");

-- CreateIndex
CREATE INDEX "Status_workspaceId_createdAt_idx" ON "Status"("workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Status_workspaceId_name_key" ON "Status"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Task_workspaceId_active_createdAt_idx" ON "Task"("workspaceId", "active", "createdAt");

-- CreateIndex
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Task_workspaceId_sequenceNumber_key" ON "Task"("workspaceId", "sequenceNumber");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceRole" ADD CONSTRAINT "WorkspaceRole_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_roleId_workspaceId_fkey" FOREIGN KEY ("roleId", "workspaceId") REFERENCES "WorkspaceRole"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Status" ADD CONSTRAINT "Status_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReply" ADD CONSTRAINT "CommentReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRole" ADD CONSTRAINT "TaskRole_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "TaskRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
