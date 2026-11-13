-- Store legacy Tokens.json extras (warnedBefore, etc.) on bot instances
ALTER TABLE "bot_instances" ADD COLUMN IF NOT EXISTS "meta" JSONB;
