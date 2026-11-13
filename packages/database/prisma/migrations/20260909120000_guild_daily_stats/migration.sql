-- CreateTable
CREATE TABLE "guild_daily_stats" (
    "id" TEXT NOT NULL,
    "botClientId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "joins" INTEGER NOT NULL DEFAULT 0,
    "leaves" INTEGER NOT NULL DEFAULT 0,
    "memberCount" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guild_daily_stats_botClientId_day_idx" ON "guild_daily_stats"("botClientId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "guild_daily_stats_botClientId_guildId_day_key" ON "guild_daily_stats"("botClientId", "guildId", "day");
