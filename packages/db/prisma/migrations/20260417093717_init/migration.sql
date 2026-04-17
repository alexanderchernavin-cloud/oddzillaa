-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'blocked');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('deposit', 'withdrawal', 'stake', 'payout', 'adjustment');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'confirmed', 'rejected', 'failed');

-- CreateEnum
CREATE TYPE "FeedSource" AS ENUM ('oddin', 'manual');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('scheduled', 'live', 'finished', 'cancelled', 'postponed');

-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('match_winner', 'map_winner');

-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('open', 'suspended', 'settled', 'cancelled');

-- CreateEnum
CREATE TYPE "OutcomeStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "OutcomeResult" AS ENUM ('unsettled', 'won', 'lost', 'void');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('pending', 'accepted', 'rejected', 'won', 'lost', 'void', 'cashout');

-- CreateEnum
CREATE TYPE "SelectionStatus" AS ENUM ('pending', 'won', 'lost', 'void');

-- CreateEnum
CREATE TYPE "ProducerStatus" AS ENUM ('up', 'down', 'unknown');

-- CreateEnum
CREATE TYPE "FeedMessageType" AS ENUM ('alive', 'odds_change', 'fixture_change', 'bet_cancel', 'bet_settlement', 'rollback_bet_cancel', 'rollback_bet_settlement', 'snapshot_complete');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('requested', 'in_progress', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "SettlementEventKind" AS ENUM ('settlement', 'rollback');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "globalLimitUsdt" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "betDelaySeconds" INTEGER NOT NULL DEFAULT 0,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "usdtBalance" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "lockedBalance" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amountUsdt" DECIMAL(24,8) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" UUID NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" UUID,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" UUID NOT NULL,
    "feedId" TEXT NOT NULL,
    "source" "FeedSource" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "sportId" UUID NOT NULL,
    "feedId" TEXT,
    "source" "FeedSource" NOT NULL,
    "name" TEXT NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "feedId" TEXT NOT NULL,
    "source" "FeedSource" NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" UUID NOT NULL,
    "tournamentId" UUID NOT NULL,
    "feedId" TEXT NOT NULL,
    "source" "FeedSource" NOT NULL,
    "homeName" TEXT NOT NULL,
    "awayName" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'scheduled',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "feedId" TEXT NOT NULL,
    "source" "FeedSource" NOT NULL,
    "type" "MarketType" NOT NULL,
    "specifier" TEXT,
    "status" "MarketStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" UUID NOT NULL,
    "marketId" UUID NOT NULL,
    "feedId" TEXT NOT NULL,
    "source" "FeedSource" NOT NULL,
    "label" TEXT NOT NULL,
    "feedPrice" DECIMAL(24,8),
    "adjustedPrice" DECIMAL(24,8),
    "status" "OutcomeStatus" NOT NULL DEFAULT 'active',
    "result" "OutcomeResult" NOT NULL DEFAULT 'unsettled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "stakeUsdt" DECIMAL(24,8) NOT NULL,
    "totalOdds" DECIMAL(24,8) NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "rejectReason" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSelection" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "outcomeId" UUID NOT NULL,
    "priceAtSubmit" DECIMAL(24,8) NOT NULL,
    "status" "SelectionStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "TicketSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producer" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" "ProducerStatus" NOT NULL DEFAULT 'unknown',
    "lastAliveAt" TIMESTAMP(3),
    "lastMessageTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedMessage" (
    "id" UUID NOT NULL,
    "producerId" INTEGER NOT NULL,
    "messageType" "FeedMessageType" NOT NULL,
    "routingKey" TEXT NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "requestId" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,

    CONSTRAINT "FeedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoverySession" (
    "id" UUID NOT NULL,
    "producerId" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "afterTimestamp" TIMESTAMP(3),
    "status" "RecoveryStatus" NOT NULL DEFAULT 'requested',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "RecoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementEvent" (
    "id" UUID NOT NULL,
    "producerId" INTEGER NOT NULL,
    "kind" "SettlementEventKind" NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,

    CONSTRAINT "SettlementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_idx" ON "Transaction"("userId", "type");

-- CreateIndex
CREATE INDEX "Transaction_txHash_idx" ON "Transaction"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_source_feedId_key" ON "Sport"("source", "feedId");

-- CreateIndex
CREATE INDEX "Category_sportId_idx" ON "Category"("sportId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_source_sportId_feedId_key" ON "Category"("source", "sportId", "feedId");

-- CreateIndex
CREATE INDEX "Tournament_categoryId_idx" ON "Tournament"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_source_feedId_key" ON "Tournament"("source", "feedId");

-- CreateIndex
CREATE INDEX "Match_tournamentId_idx" ON "Match"("tournamentId");

-- CreateIndex
CREATE INDEX "Match_startTime_idx" ON "Match"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Match_source_feedId_key" ON "Match"("source", "feedId");

-- CreateIndex
CREATE INDEX "Market_matchId_idx" ON "Market"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Market_source_feedId_matchId_specifier_key" ON "Market"("source", "feedId", "matchId", "specifier");

-- CreateIndex
CREATE INDEX "Outcome_marketId_idx" ON "Outcome"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "Outcome_source_feedId_marketId_key" ON "Outcome"("source", "feedId", "marketId");

-- CreateIndex
CREATE INDEX "Ticket_userId_status_idx" ON "Ticket"("userId", "status");

-- CreateIndex
CREATE INDEX "Ticket_submittedAt_idx" ON "Ticket"("submittedAt");

-- CreateIndex
CREATE INDEX "TicketSelection_ticketId_idx" ON "TicketSelection"("ticketId");

-- CreateIndex
CREATE INDEX "TicketSelection_outcomeId_idx" ON "TicketSelection"("outcomeId");

-- CreateIndex
CREATE UNIQUE INDEX "Producer_name_key" ON "Producer"("name");

-- CreateIndex
CREATE INDEX "FeedMessage_producerId_receivedAt_idx" ON "FeedMessage"("producerId", "receivedAt");

-- CreateIndex
CREATE INDEX "FeedMessage_processedAt_idx" ON "FeedMessage"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedMessage_producerId_messageType_sourceMessageId_key" ON "FeedMessage"("producerId", "messageType", "sourceMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "RecoverySession_requestId_key" ON "RecoverySession"("requestId");

-- CreateIndex
CREATE INDEX "RecoverySession_producerId_status_idx" ON "RecoverySession"("producerId", "status");

-- CreateIndex
CREATE INDEX "SettlementEvent_processedAt_idx" ON "SettlementEvent"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementEvent_producerId_sourceMessageId_key" ON "SettlementEvent"("producerId", "sourceMessageId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSelection" ADD CONSTRAINT "TicketSelection_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSelection" ADD CONSTRAINT "TicketSelection_outcomeId_fkey" FOREIGN KEY ("outcomeId") REFERENCES "Outcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedMessage" ADD CONSTRAINT "FeedMessage_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "Producer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoverySession" ADD CONSTRAINT "RecoverySession_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "Producer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementEvent" ADD CONSTRAINT "SettlementEvent_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "Producer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
