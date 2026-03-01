-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "hashed_token" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_id" UUID,
    "user_id" UUID,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_hashed_token_key" ON "sessions"("hashed_token");

-- CreateIndex
CREATE INDEX "idx_sessions_token" ON "sessions"("hashed_token");

-- CreateIndex
CREATE INDEX "idx_sessions_client" ON "sessions"("client_id");

-- CreateIndex
CREATE INDEX "idx_sessions_user" ON "sessions"("user_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
