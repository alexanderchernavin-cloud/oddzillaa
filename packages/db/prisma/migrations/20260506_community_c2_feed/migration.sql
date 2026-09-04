-- Phase C-2: Community feed projection
-- Adds Ticket.analysisText (nullable, schema-ready for AI captions in a later
-- phase) and the CommunityTicket projection table written from
-- SettlementService.resolveTicket on each ticket settlement.

ALTER TABLE "Ticket" ADD COLUMN "analysisText" TEXT;

CREATE TABLE "CommunityTicket" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "stakeUsdt" DECIMAL(24,8) NOT NULL,
    "payoutUsdt" DECIMAL(24,8) NOT NULL,
    "totalOdds" DECIMAL(24,8) NOT NULL,
    "numLegs" INTEGER NOT NULL,
    "status" "TicketStatus" NOT NULL,
    "sportIds" UUID[] NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityTicket_ticketId_key" ON "CommunityTicket"("ticketId");
CREATE INDEX "CommunityTicket_settledAt_idx" ON "CommunityTicket"("settledAt" DESC);
CREATE INDEX "CommunityTicket_score_settledAt_idx" ON "CommunityTicket"("score" DESC, "settledAt" DESC);
CREATE INDEX "CommunityTicket_userId_settledAt_idx" ON "CommunityTicket"("userId", "settledAt" DESC);

ALTER TABLE "CommunityTicket" ADD CONSTRAINT "CommunityTicket_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityTicket" ADD CONSTRAINT "CommunityTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
