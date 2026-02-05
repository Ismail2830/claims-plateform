-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "additional_notes" TEXT,
ADD COLUMN     "damage_description" TEXT,
ADD COLUMN     "emergency_services" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emergency_services_details" TEXT,
ADD COLUMN     "police_report" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "police_report_number" VARCHAR(100);

-- CreateTable
CREATE TABLE "claim_witnesses" (
    "witness_id" UUID NOT NULL,
    "claim_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "relationship" VARCHAR(100),
    "statement_given" BOOLEAN NOT NULL DEFAULT false,
    "statement_text" TEXT,
    "statement_date" TIMESTAMP(3),
    "is_reachable" BOOLEAN NOT NULL DEFAULT true,
    "last_contact_date" TIMESTAMP(3),
    "contact_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claim_witnesses_pkey" PRIMARY KEY ("witness_id")
);

-- CreateIndex
CREATE INDEX "idx_claim_witnesses_claim" ON "claim_witnesses"("claim_id");

-- CreateIndex
CREATE INDEX "idx_claim_witnesses_name" ON "claim_witnesses"("name");

-- CreateIndex
CREATE INDEX "idx_claim_witnesses_date" ON "claim_witnesses"("created_at");

-- AddForeignKey
ALTER TABLE "claim_witnesses" ADD CONSTRAINT "claim_witnesses_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "claims"("claim_id") ON DELETE CASCADE ON UPDATE CASCADE;
