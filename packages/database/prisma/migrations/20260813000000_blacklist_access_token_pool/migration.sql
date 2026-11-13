-- AlterEnum
-- AlterTable
CREATE TABLE "user_blacklists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_blacklists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_blacklists_userId_key" ON "user_blacklists"("userId");
CREATE INDEX "user_blacklists_expiresAt_idx" ON "user_blacklists"("expiresAt");

CREATE TABLE "dashboard_access" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ownerId" TEXT,
    "guildId" TEXT,
    "purchasesId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dashboard_access_slug_key" ON "dashboard_access"("slug");
CREATE UNIQUE INDEX "dashboard_access_clientId_key" ON "dashboard_access"("clientId");
CREATE INDEX "dashboard_access_ownerId_idx" ON "dashboard_access"("ownerId");

CREATE TYPE "TokenPoolKind" AS ENUM ('unused', 'working', 'non_working', 'error', 'expired', 'botmaker', 'expiring');

CREATE TABLE "token_pool_entries" (
    "id" TEXT NOT NULL,
    "kind" "TokenPoolKind" NOT NULL,
    "token" TEXT NOT NULL,
    "clientId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_pool_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "token_pool_entries_kind_token_key" ON "token_pool_entries"("kind", "token");
CREATE INDEX "token_pool_entries_kind_idx" ON "token_pool_entries"("kind");
CREATE INDEX "token_pool_entries_clientId_idx" ON "token_pool_entries"("clientId");

CREATE TABLE "apply_audit_logs" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apply_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "apply_audit_logs_botId_createdAt_idx" ON "apply_audit_logs"("botId", "createdAt");
CREATE INDEX "apply_audit_logs_botId_category_idx" ON "apply_audit_logs"("botId", "category");
