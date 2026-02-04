-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('ACCIDENT', 'THEFT', 'FIRE', 'WATER_DAMAGE');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE', 'IN_DECISION', 'APPROVED', 'IN_PAYMENT', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DeclarationChannel" AS ENUM ('WEB', 'MOBILE', 'PHONE', 'API');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('AUTO', 'HOME', 'HEALTH', 'LIFE');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'BLOCKED');

-- CreateTable
CREATE TABLE "Client" (
    "client_id" UUID NOT NULL,
    "cin" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "documentVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("client_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100),
    "last_name" VARCHAR(100),
    "role" "UserRole" NOT NULL,
    "current_workload" INTEGER NOT NULL DEFAULT 0,
    "max_workload" INTEGER NOT NULL DEFAULT 20,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "policies" (
    "policy_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "policy_number" VARCHAR(50) NOT NULL,
    "policy_type" "PolicyType" NOT NULL,
    "coverage_type" VARCHAR(100),
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "premium_amount" DECIMAL(12,2) NOT NULL,
    "insured_amount" DECIMAL(12,2) NOT NULL,
    "deductible" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("policy_id")
);

-- CreateTable
CREATE TABLE "claims" (
    "claim_id" UUID NOT NULL,
    "claim_number" VARCHAR(50) NOT NULL,
    "policy_id" UUID,
    "client_id" UUID NOT NULL,
    "claim_type" "ClaimType" NOT NULL,
    "incident_date" TIMESTAMP(3) NOT NULL,
    "declaration_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incident_location" TEXT,
    "description" TEXT NOT NULL,
    "claimed_amount" DECIMAL(12,2),
    "estimated_amount" DECIMAL(12,2),
    "approved_amount" DECIMAL(12,2),
    "status" "ClaimStatus" NOT NULL DEFAULT 'DECLARED',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "assigned_to" UUID,
    "risk_score" DECIMAL(5,2),
    "fraud_score" DECIMAL(5,2),
    "declaration_channel" "DeclarationChannel",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("claim_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_cin_key" ON "Client"("cin");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_phone_key" ON "Client"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "policies_policy_number_key" ON "policies"("policy_number");

-- CreateIndex
CREATE INDEX "idx_policies_client" ON "policies"("client_id");

-- CreateIndex
CREATE INDEX "idx_policies_status" ON "policies"("status");

-- CreateIndex
CREATE INDEX "idx_policies_type" ON "policies"("policy_type");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claim_number_key" ON "claims"("claim_number");

-- CreateIndex
CREATE INDEX "idx_claims_client" ON "claims"("client_id");

-- CreateIndex
CREATE INDEX "idx_claims_policy" ON "claims"("policy_id");

-- CreateIndex
CREATE INDEX "idx_claims_status" ON "claims"("status");

-- CreateIndex
CREATE INDEX "idx_claims_assigned" ON "claims"("assigned_to");

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("policy_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("client_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
