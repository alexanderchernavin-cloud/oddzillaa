-- Phase 4: Production Launch
-- Add account lifecycle fields, deposit/withdrawal models

-- User account lifecycle fields
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerifyToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetPasswordToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetPasswordExpires" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "selfExcludedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "dailyDepositLimit" DECIMAL(24,8);
ALTER TABLE "User" ADD COLUMN "weeklyDepositLimit" DECIMAL(24,8);

-- Deposit addresses
CREATE TABLE "DepositAddress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'TRC20',
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DepositAddress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DepositAddress_userId_network_key" ON "DepositAddress"("userId", "network");
CREATE INDEX "DepositAddress_address_idx" ON "DepositAddress"("address");
ALTER TABLE "DepositAddress" ADD CONSTRAINT "DepositAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Withdrawal requests
CREATE TYPE "WithdrawalStatus" AS ENUM ('pending', 'approved', 'rejected', 'completed');

CREATE TABLE "WithdrawalRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "amountUsdt" DECIMAL(24,8) NOT NULL,
    "toAddress" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'TRC20',
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "reviewedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WithdrawalRequest_userId_status_idx" ON "WithdrawalRequest"("userId", "status");
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
