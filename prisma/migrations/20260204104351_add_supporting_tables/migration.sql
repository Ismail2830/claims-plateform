-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PHOTO', 'PDF', 'INVOICE', 'ESTIMATE', 'POLICE_REPORT', 'MEDICAL_REPORT', 'IDENTITY_DOCUMENT', 'INSURANCE_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('GENERAL', 'STATUS_UPDATE', 'DOCUMENT_REQUEST', 'EXPERT_NOTE', 'CLIENT_QUESTION', 'INTERNAL_NOTE');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CLAIM', 'CLIENT', 'USER', 'POLICY', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'UPLOAD', 'DOWNLOAD', 'APPROVE', 'REJECT', 'ASSIGN', 'UNASSIGN', 'STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "claim_documents" (
    "document_id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "file_type" "DocumentType" NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "uploaded_by" UUID,
    "uploaded_by_client" UUID,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verified_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claim_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "claim_status_history" (
    "history_id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "from_status" "ClaimStatus",
    "to_status" "ClaimStatus" NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "notes" TEXT,
    "is_system_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_status_history_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "claim_comments" (
    "comment_id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "comment_type" "CommentType" NOT NULL DEFAULT 'GENERAL',
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "author_id" UUID,
    "author_client_id" UUID,
    "parent_comment_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "read_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claim_comments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "log_id" UUID NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "claim_id" UUID,
    "action" "AuditAction" NOT NULL,
    "description" TEXT NOT NULL,
    "user_id" UUID,
    "client_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "session_id" VARCHAR(255),
    "old_values" JSONB,
    "new_values" JSONB,
    "metadata" JSONB,
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "is_suspicious" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE INDEX "idx_claim_documents_claim" ON "claim_documents"("claim_id");

-- CreateIndex
CREATE INDEX "idx_claim_documents_type" ON "claim_documents"("file_type");

-- CreateIndex
CREATE INDEX "idx_claim_documents_status" ON "claim_documents"("status");

-- CreateIndex
CREATE INDEX "idx_claim_status_history_claim" ON "claim_status_history"("claim_id");

-- CreateIndex
CREATE INDEX "idx_claim_status_history_status" ON "claim_status_history"("to_status");

-- CreateIndex
CREATE INDEX "idx_claim_status_history_user" ON "claim_status_history"("changed_by");

-- CreateIndex
CREATE INDEX "idx_claim_status_history_date" ON "claim_status_history"("created_at");

-- CreateIndex
CREATE INDEX "idx_claim_comments_claim" ON "claim_comments"("claim_id");

-- CreateIndex
CREATE INDEX "idx_claim_comments_author_user" ON "claim_comments"("author_id");

-- CreateIndex
CREATE INDEX "idx_claim_comments_author_client" ON "claim_comments"("author_client_id");

-- CreateIndex
CREATE INDEX "idx_claim_comments_parent" ON "claim_comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "idx_claim_comments_date" ON "claim_comments"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_claim" ON "audit_logs"("claim_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_client" ON "audit_logs"("client_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_audit_logs_date" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_risk" ON "audit_logs"("risk_level");

-- AddForeignKey
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("claim_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_uploaded_by_client_fkey" FOREIGN KEY ("uploaded_by_client") REFERENCES "Client"("client_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_documents" ADD CONSTRAINT "claim_documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_status_history" ADD CONSTRAINT "claim_status_history_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("claim_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_status_history" ADD CONSTRAINT "claim_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_comments" ADD CONSTRAINT "claim_comments_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("claim_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_comments" ADD CONSTRAINT "claim_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_comments" ADD CONSTRAINT "claim_comments_author_client_id_fkey" FOREIGN KEY ("author_client_id") REFERENCES "Client"("client_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_comments" ADD CONSTRAINT "claim_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "claim_comments"("comment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_comments" ADD CONSTRAINT "claim_comments_read_by_fkey" FOREIGN KEY ("read_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("claim_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("client_id") ON DELETE SET NULL ON UPDATE CASCADE;
