-- Allow balances larger than Int32 (e.g. 10_000_000_000)
ALTER TABLE "bot_balances" ALTER COLUMN "coins" SET DATA TYPE BIGINT;
ALTER TABLE "bot_balances" ALTER COLUMN "balance" SET DATA TYPE BIGINT;
