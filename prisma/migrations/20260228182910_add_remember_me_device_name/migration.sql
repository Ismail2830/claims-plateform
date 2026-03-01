-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "device_name" VARCHAR(100),
ADD COLUMN     "remember_me" BOOLEAN NOT NULL DEFAULT false;
