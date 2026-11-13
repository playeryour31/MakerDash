/**
 * Data layer boundary.
 *
 * Phase 1 SSOT: PostgreSQL via @maker/database (BotInstance, Apply, jobs, runtime).
 * Physical JSON stores (being phased out for Apply/Tokens/RunBots):
 * - /Database
 * - /Maker/Json-Database
 *
 * MongoDB remains secondary: audit / sessions / blacklist.
 *
 * Nest API and Discord bots should access bot data through services /
 * internal API — do not scatter raw paths for Phase 1 domains.
 */
module.exports = {
  ...require('../src/shared/db/paths'),
  databasePackage: '@maker/database',
};
