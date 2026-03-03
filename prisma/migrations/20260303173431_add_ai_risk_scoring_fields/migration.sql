-- CreateEnum
CREATE TYPE "RiskLabel" AS ENUM ('FAIBLE', 'MOYEN', 'ELEVE', 'SUSPICIEUX');

-- CreateEnum
CREATE TYPE "DecisionIA" AS ENUM ('AUTO_APPROUVER', 'REVISION_MANUELLE', 'ESCALADER');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "anciennete_annees" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "montant_total_passe" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "nb_sinistres_passes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "decision_ia" "DecisionIA",
ADD COLUMN     "label_risque" "RiskLabel",
ADD COLUMN     "score_confidence" DOUBLE PRECISION,
ADD COLUMN     "score_risque" INTEGER,
ADD COLUMN     "scored_at" TIMESTAMP(3);
