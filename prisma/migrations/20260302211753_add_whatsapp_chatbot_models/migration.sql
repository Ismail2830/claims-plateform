-- CreateEnum
CREATE TYPE "WhatsappDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "ClaimSource" AS ENUM ('WEB', 'WHATSAPP', 'MOBILE', 'AGENT');

-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "source" "ClaimSource" NOT NULL DEFAULT 'WEB';

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "client_id" UUID,
    "current_step" VARCHAR(50) NOT NULL DEFAULT 'MENU',
    "context" JSONB NOT NULL DEFAULT '{}',
    "last_message" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "direction" "WhatsappDirection" NOT NULL,
    "content" TEXT NOT NULL,
    "intent" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_phone_key" ON "whatsapp_sessions"("phone");

-- CreateIndex
CREATE INDEX "idx_wa_sessions_phone" ON "whatsapp_sessions"("phone");

-- CreateIndex
CREATE INDEX "idx_wa_sessions_client" ON "whatsapp_sessions"("client_id");

-- CreateIndex
CREATE INDEX "idx_wa_messages_phone" ON "whatsapp_messages"("phone");

-- CreateIndex
CREATE INDEX "idx_wa_messages_direction" ON "whatsapp_messages"("direction");

-- CreateIndex
CREATE INDEX "idx_wa_messages_date" ON "whatsapp_messages"("created_at");

-- AddForeignKey
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("client_id") ON DELETE SET NULL ON UPDATE CASCADE;
