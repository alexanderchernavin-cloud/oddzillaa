-- Delete duplicate markets (keeping the most recently updated of each group)
DELETE FROM "Market"
WHERE id NOT IN (
  SELECT DISTINCT ON (source, "feedId", "matchId", COALESCE(specifier, ''))
    id FROM "Market"
  ORDER BY source, "feedId", "matchId", COALESCE(specifier, ''), "updatedAt" DESC
);

-- Backfill existing NULL specifiers to empty string
UPDATE "Market" SET "specifier" = '' WHERE "specifier" IS NULL;

-- AlterTable
ALTER TABLE "Market" ALTER COLUMN "specifier" SET NOT NULL,
ALTER COLUMN "specifier" SET DEFAULT '';
