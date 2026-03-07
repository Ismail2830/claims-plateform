-- CreateEnum
CREATE TYPE "UploadSource" AS ENUM ('WEB', 'WHATSAPP', 'MOBILE', 'AGENT');

-- CreateEnum
CREATE TYPE "AccessAction" AS ENUM ('VIEW', 'DOWNLOAD', 'VERIFY', 'REJECT', 'DELETE', 'UPLOAD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentStatus" ADD VALUE 'ARCHIVED';
ALTER TYPE "DocumentStatus" ADD VALUE 'PENDING_RESUBMIT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'CONSTAT';
ALTER TYPE "DocumentType" ADD VALUE 'EXPERTISE_REPORT';
ALTER TYPE "DocumentType" ADD VALUE 'DEATH_CERTIFICATE';
ALTER TYPE "DocumentType" ADD VALUE 'HOSPITAL_BILL';
ALTER TYPE "DocumentType" ADD VALUE 'PRESCRIPTION';
ALTER TYPE "DocumentType" ADD VALUE 'VEHICLE_REGISTRATION';
ALTER TYPE "DocumentType" ADD VALUE 'DRIVERS_LICENSE';
ALTER TYPE "DocumentType" ADD VALUE 'BANK_DETAILS';
ALTER TYPE "DocumentType" ADD VALUE 'LEGAL_DOCUMENT';

-- AlterTable
ALTER TABLE "claim_documents" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejection_note" TEXT,
ADD COLUMN     "uploaded_via" "UploadSource" NOT NULL DEFAULT 'WEB';

-- CreateTable
CREATE TABLE "document_access_logs" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" "AccessAction" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_access_logs_document_id_idx" ON "document_access_logs"("document_id");

-- AddForeignKey
ALTER TABLE "document_access_logs" ADD CONSTRAINT "document_access_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "claim_documents"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_access_logs" ADD CONSTRAINT "document_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
