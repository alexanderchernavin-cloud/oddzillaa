-- Phase C-1: Community profiles + visibility
-- Adds the User columns and seed role needed for public profiles, the visibility
-- toggle, and Phase C-4 AI seed accounts. Defaults are chosen so existing rows
-- get the desired behaviour with no backfill.

-- Seed role for AI-generated bettors (Phase C-4).
-- Note: ALTER TYPE ... ADD VALUE must complete before the new value is referenced.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'seed';

-- D1: ticketsPublic defaults to true so existing users opt in by default.
-- D2: isAi exists in the DB but is never serialised by the API.
ALTER TABLE "User" ADD COLUMN "ticketsPublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "nickname" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "isAi" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");
