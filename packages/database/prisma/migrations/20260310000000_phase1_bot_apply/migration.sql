-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BotType" AS ENUM ('Apply', 'Azkar', 'Autoline', 'Feedback', 'Giveaway', 'Log', 'Offer', 'Package', 'Protection', 'Selfrole', 'Stock', 'Suggestion', 'System', 'Tax', 'Ticket', 'TempRole', 'TempVoice');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('Ar', 'En');

-- CreateEnum
CREATE TYPE "ApplyPanelStatus" AS ENUM ('on', 'off');

-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('CREATE_PANEL', 'UPDATE_PANEL', 'DELETE_PANEL', 'APPLY_ACTION', 'DASHBOARD_LOG');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'processing', 'done', 'failed');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "bot_instances" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tokenEnc" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "buyerId" TEXT,
    "sellerId" TEXT,
    "botNumber" INTEGER,
    "type" "BotType" NOT NULL,
    "guildId" TEXT,
    "serverId" TEXT,
    "servers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" DOUBLE PRECISION,
    "node" INTEGER,
    "purchasesId" INTEGER,
    "tokenType" TEXT,
    "dashboardSlug" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "language" "Language" NOT NULL DEFAULT 'Ar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_runtimes" (
    "clientId" TEXT NOT NULL,
    "running" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_runtimes_pkey" PRIMARY KEY ("clientId")
);

-- CreateTable
CREATE TABLE "apply_guild_settings" (
    "id" TEXT NOT NULL,
    "botClientId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "adminRoleId" TEXT,
    "logsChannelId" TEXT,
    "dmAccept" TEXT NOT NULL DEFAULT 'off',
    "dmReject" TEXT NOT NULL DEFAULT 'off',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apply_guild_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apply_panels" (
    "id" TEXT NOT NULL,
    "botClientId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "channelId" TEXT,
    "guildId" TEXT,
    "message" TEXT NOT NULL DEFAULT '',
    "status" "ApplyPanelStatus" NOT NULL DEFAULT 'on',
    "questions" JSONB NOT NULL DEFAULT '[]',
    "legacyAsks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apply_panels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apply_panel_applicants" (
    "id" TEXT NOT NULL,
    "panelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apply_panel_applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apply_applications" (
    "id" TEXT NOT NULL,
    "botClientId" TEXT NOT NULL,
    "panelMessageId" TEXT,
    "userId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "meta" JSONB,
    "discordRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "apply_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_jobs" (
    "id" TEXT NOT NULL,
    "botClientId" TEXT NOT NULL,
    "kind" "JobKind" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "bot_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bot_instances_clientId_key" ON "bot_instances"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "bot_instances_dashboardSlug_key" ON "bot_instances"("dashboardSlug");

-- CreateIndex
CREATE INDEX "bot_instances_ownerId_idx" ON "bot_instances"("ownerId");

-- CreateIndex
CREATE INDEX "bot_instances_type_idx" ON "bot_instances"("type");

-- CreateIndex
CREATE INDEX "bot_instances_endsAt_idx" ON "bot_instances"("endsAt");

-- CreateIndex
CREATE INDEX "apply_guild_settings_botClientId_idx" ON "apply_guild_settings"("botClientId");

-- CreateIndex
CREATE UNIQUE INDEX "apply_guild_settings_botClientId_guildId_key" ON "apply_guild_settings"("botClientId", "guildId");

-- CreateIndex
CREATE INDEX "apply_panels_botClientId_idx" ON "apply_panels"("botClientId");

-- CreateIndex
CREATE UNIQUE INDEX "apply_panels_botClientId_messageId_key" ON "apply_panels"("botClientId", "messageId");

-- CreateIndex
CREATE INDEX "apply_panel_applicants_userId_idx" ON "apply_panel_applicants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "apply_panel_applicants_panelId_userId_key" ON "apply_panel_applicants"("panelId", "userId");

-- CreateIndex
CREATE INDEX "apply_applications_botClientId_status_idx" ON "apply_applications"("botClientId", "status");

-- CreateIndex
CREATE INDEX "apply_applications_userId_idx" ON "apply_applications"("userId");

-- CreateIndex
CREATE INDEX "bot_jobs_botClientId_status_idx" ON "bot_jobs"("botClientId", "status");

-- CreateIndex
CREATE INDEX "bot_jobs_status_kind_idx" ON "bot_jobs"("status", "kind");

-- AddForeignKey
ALTER TABLE "bot_runtimes" ADD CONSTRAINT "bot_runtimes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "bot_instances"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apply_guild_settings" ADD CONSTRAINT "apply_guild_settings_botClientId_fkey" FOREIGN KEY ("botClientId") REFERENCES "bot_instances"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apply_panels" ADD CONSTRAINT "apply_panels_botClientId_fkey" FOREIGN KEY ("botClientId") REFERENCES "bot_instances"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apply_panel_applicants" ADD CONSTRAINT "apply_panel_applicants_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "apply_panels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apply_applications" ADD CONSTRAINT "apply_applications_botClientId_fkey" FOREIGN KEY ("botClientId") REFERENCES "bot_instances"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_jobs" ADD CONSTRAINT "bot_jobs_botClientId_fkey" FOREIGN KEY ("botClientId") REFERENCES "bot_instances"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;
