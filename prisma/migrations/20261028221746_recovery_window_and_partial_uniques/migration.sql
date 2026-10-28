-- DropIndex
DROP INDEX "User_documentType_documentNumber_key";

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "Workspace_ownerId_name_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "recoveryDate" TIMESTAMP(3),
ADD COLUMN     "releasedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "recoveryDate" TIMESTAMP(3),
ADD COLUMN     "releasedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email") WHERE ("releasedAt" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "User_documentType_documentNumber_key" ON "User"("documentType", "documentNumber") WHERE ("releasedAt" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_ownerId_name_key" ON "Workspace"("ownerId", "name") WHERE ("releasedAt" IS NULL);

