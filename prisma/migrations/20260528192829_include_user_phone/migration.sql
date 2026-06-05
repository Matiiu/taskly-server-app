-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneCountryCode" TEXT,
ADD COLUMN     "phoneNumber" TEXT;

-- DropEnum
DROP TYPE "TaskStatus";
