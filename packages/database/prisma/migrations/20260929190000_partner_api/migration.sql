-- Partner API keys + idempotent external orders
CREATE TYPE "PartnerOrderStatus" AS ENUM ('pending', 'fulfilled', 'failed');
CREATE TYPE "PartnerTokenSource" AS ENUM ('customer', 'pool');

CREATE TABLE "partner_api_keys" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "secretEnc" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['catalog:read', 'orders:read', 'orders:write']::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_api_keys_keyId_key" ON "partner_api_keys"("keyId");
CREATE INDEX "partner_api_keys_enabled_idx" ON "partner_api_keys"("enabled");

CREATE TABLE "partner_orders" (
    "id" TEXT NOT NULL,
    "partnerKeyId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "ownerDiscordId" TEXT NOT NULL,
    "botType" "BotType" NOT NULL,
    "clientId" TEXT,
    "tokenSource" "PartnerTokenSource" NOT NULL,
    "status" "PartnerOrderStatus" NOT NULL DEFAULT 'pending',
    "dashboardSlug" TEXT,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "errorMessage" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "partner_orders_partnerKeyId_externalOrderId_key" ON "partner_orders"("partnerKeyId", "externalOrderId");
CREATE INDEX "partner_orders_externalOrderId_idx" ON "partner_orders"("externalOrderId");
CREATE INDEX "partner_orders_clientId_idx" ON "partner_orders"("clientId");
CREATE INDEX "partner_orders_status_idx" ON "partner_orders"("status");

ALTER TABLE "partner_orders" ADD CONSTRAINT "partner_orders_partnerKeyId_fkey" FOREIGN KEY ("partnerKeyId") REFERENCES "partner_api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
