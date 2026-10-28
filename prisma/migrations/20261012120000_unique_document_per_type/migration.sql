-- A document number is unique per document type, not globally.

-- DropIndex
DROP INDEX "User_documentNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "User_documentType_documentNumber_key" ON "User"("documentType", "documentNumber");
