-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_id" UUID,
    "user_id" UUID,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_prt_token" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_prt_expires" ON "password_reset_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
