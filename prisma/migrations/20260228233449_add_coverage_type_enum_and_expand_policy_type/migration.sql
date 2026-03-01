-- ── 1. Expand PolicyType enum with new values ─────────────────────────────
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'PROFESSIONAL';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'AGRICULTURE';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'TRANSPORT';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'CONSTRUCTION';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'LIABILITY';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'ACCIDENT';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'ASSISTANCE';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'CREDIT';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'SURETY';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'TAKAFUL_NON_VIE';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'TAKAFUL_VIE';

-- ── 2. Create CoverageType enum ───────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "CoverageType" AS ENUM (
    'RC_ONLY', 'THIRD_PARTY_PLUS', 'COMPREHENSIVE',
    'FIRE_ONLY', 'MULTIRISQUES', 'LANDLORD',
    'AMO_BASIC', 'COMPLEMENTAIRE', 'FULL_COVER',
    'TERM_LIFE', 'WHOLE_LIFE', 'SAVINGS', 'RETIREMENT',
    'TRC_ONLY', 'RCD_ONLY', 'TRC_AND_RCD',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ── 3. Nullify any existing varchar values that can't cast to the enum ────
--    (safe: column is already nullable from previous migration)
UPDATE "policies" SET "coverage_type" = NULL WHERE "coverage_type" IS NOT NULL;

-- ── 4. Alter column from VARCHAR to CoverageType enum ────────────────────
ALTER TABLE "policies"
  ALTER COLUMN "coverage_type" TYPE "CoverageType"
  USING "coverage_type"::"CoverageType";
