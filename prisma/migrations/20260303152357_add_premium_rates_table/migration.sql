-- CreateTable
CREATE TABLE "premium_rates" (
    "id" UUID NOT NULL,
    "policy_type" VARCHAR(50) NOT NULL,
    "base_premium" DECIMAL(10,2) NOT NULL,
    "rate_per_year" DECIMAL(8,2) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "premium_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "premium_rates_policy_type_key" ON "premium_rates"("policy_type");

-- CreateIndex
CREATE INDEX "idx_premium_rates_type" ON "premium_rates"("policy_type");
