-- CreateEnum
CREATE TYPE "PremiumFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- AlterTable: make coverage_type nullable (no data loss)
ALTER TABLE "policies" ALTER COLUMN "coverage_type" DROP NOT NULL;

-- AlterTable: add new columns with safe defaults
ALTER TABLE "policies"
  ADD COLUMN IF NOT EXISTS "renewal_date"       DATE,
  ADD COLUMN IF NOT EXISTS "premium_frequency"  "PremiumFrequency" NOT NULL DEFAULT 'ANNUAL',
  ADD COLUMN IF NOT EXISTS "is_obligatory"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_takaful"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "notes"              TEXT;
