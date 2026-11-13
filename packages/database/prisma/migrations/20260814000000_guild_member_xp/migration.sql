-- CreateTable
CREATE TABLE "guild_member_xp" (
    "id" TEXT NOT NULL,
    "botClientId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "lastVoiceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_member_xp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guild_member_xp_botClientId_guildId_userId_key" ON "guild_member_xp"("botClientId", "guildId", "userId");

-- CreateIndex
CREATE INDEX "guild_member_xp_botClientId_guildId_xp_idx" ON "guild_member_xp"("botClientId", "guildId", "xp" DESC);

-- CreateIndex
CREATE INDEX "guild_member_xp_botClientId_guildId_level_idx" ON "guild_member_xp"("botClientId", "guildId", "level" DESC);

-- CreateIndex
CREATE INDEX "guild_member_xp_botClientId_userId_idx" ON "guild_member_xp"("botClientId", "userId");
