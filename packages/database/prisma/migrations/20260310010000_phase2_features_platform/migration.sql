-- Phase 2+: Feature KV, platform, balance, prefix, prices, commands

CREATE TABLE "feature_records" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "botClientId" TEXT,
    "guildId" TEXT,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "feature_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_records" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bot_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bot_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bot_prefixes" (
    "clientId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '#',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bot_prefixes_pkey" PRIMARY KEY ("clientId")
);

CREATE TABLE "guild_bot_prices" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "priceKey" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "guild_bot_prices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bot_command_configs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "commands" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bot_command_configs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feature_records_namespace_botClientId_idx" ON "feature_records"("namespace", "botClientId");
CREATE INDEX "feature_records_namespace_idx" ON "feature_records"("namespace");
CREATE UNIQUE INDEX "feature_records_namespace_key_key" ON "feature_records"("namespace", "key");
CREATE INDEX "platform_records_namespace_idx" ON "platform_records"("namespace");
CREATE UNIQUE INDEX "platform_records_namespace_key_key" ON "platform_records"("namespace", "key");
CREATE INDEX "bot_balances_guildId_balance_idx" ON "bot_balances"("guildId", "balance");
CREATE UNIQUE INDEX "bot_balances_userId_guildId_key" ON "bot_balances"("userId", "guildId");
CREATE INDEX "guild_bot_prices_guildId_idx" ON "guild_bot_prices"("guildId");
CREATE UNIQUE INDEX "guild_bot_prices_guildId_priceKey_key" ON "guild_bot_prices"("guildId", "priceKey");
CREATE UNIQUE INDEX "bot_command_configs_clientId_key" ON "bot_command_configs"("clientId");
