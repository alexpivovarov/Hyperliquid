-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'BRIDGING', 'DEPOSITING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "userAddress" VARCHAR(42) NOT NULL,
    "sourceChain" TEXT NOT NULL,
    "sourceToken" TEXT NOT NULL,
    "sourceAmount" TEXT NOT NULL,
    "destinationAmount" TEXT NOT NULL,
    "bridgeTxHash" VARCHAR(66),
    "depositTxHash" VARCHAR(66),
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deposit_userAddress_idx" ON "Deposit"("userAddress");

-- CreateIndex
CREATE INDEX "Deposit_status_idx" ON "Deposit"("status");

-- CreateIndex
CREATE INDEX "Deposit_createdAt_idx" ON "Deposit"("createdAt");
