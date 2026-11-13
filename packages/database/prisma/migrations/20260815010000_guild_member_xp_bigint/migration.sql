-- Progressive XP curves exceed Int32; store total XP as BIGINT
ALTER TABLE "guild_member_xp" ALTER COLUMN "xp" SET DATA TYPE BIGINT;
