-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_method" TEXT;
