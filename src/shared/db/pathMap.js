/**
 * Path → storage mapping for the Postgres-backed st.db bridge.
 */
const path = require('path');

function normalizePath(filePath) {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

/** @returns {{ kind: string, namespace?: string, poolKind?: string } | null} */
function resolveStore(filePath) {
  const p = normalizePath(filePath);

  // Read-only catalogs — keep real st.db / JSON file
  if (p.includes('Main/Resources/') || p.includes('Main\\Resources\\')) {
    return { kind: 'catalog' };
  }

  // Feature DBs
  const featureMap = {
    'Maker/Json-Database/Settings/ticket.json': 'ticket',
    'Maker/Json-Database/Settings/TempTicket.json': 'temp_ticket',
    'Maker/Json-Database/Settings/Protection.json': 'protection',
    'Maker/Json-Database/Settings/Giveaway.json': 'giveaway',
    'Maker/Json-Database/Settings/Autoline.json': 'autoline',
    'Maker/Json-Database/Settings/Azkar.json': 'azkar',
    'Maker/Json-Database/Settings/Quran.json': 'quran',
    'Maker/Json-Database/Settings/broadcast.json': 'broadcast',
    'Maker/Json-Database/Settings/Feedback.json': 'feedback',
    'Maker/Json-Database/Settings/Offer.json': 'offer',
    'Maker/Json-Database/Settings/Selfrole.json': 'selfrole',
    'Maker/Json-Database/Settings/shopDB.json': 'shop',
    'Maker/Json-Database/Settings/stockDB.json': 'stock_db',
    'Maker/Json-Database/Settings/Suggestion.json': 'suggestion',
    'Maker/Json-Database/Settings/Tax.json': 'tax',
    'Maker/Json-Database/Settings/TempChannels.json': 'temp_channels',
    'Maker/Json-Database/Settings/TempRole.json': 'temp_role',
    'Maker/Json-Database/Settings/TempVoice.json': 'temp_voice',
    'Maker/Json-Database/Settings/Apply.json': 'apply_legacy',
    'Maker/Json-Database/Systems/Log.json': 'sys_log',
    'Maker/Json-Database/Systems/Reply.json': 'sys_reply',
    'Maker/Json-Database/Systems/Selfrole.json': 'sys_selfrole',
    'Maker/Json-Database/Systems/Stock.json': 'sys_stock',
    'Maker/Json-Database/Systems/UserData.json': 'sys_userdata',
    'Maker/Json-Database/Systems/VoiceTemp.json': 'sys_voicetemp',
  };
  for (const [rel, ns] of Object.entries(featureMap)) {
    if (p.endsWith(rel) || p.includes(rel)) {
      return { kind: 'feature', namespace: ns };
    }
  }

  // Typed / special
  if (p.includes('Database/Others/Tokens.json') || p.endsWith('Others/Tokens.json')) {
    return { kind: 'tokens' };
  }
  if (
    p.includes('Database/BotMaker/RunBots') ||
    p.endsWith('RunBots.json') ||
    /RunBots(\.json)?$/.test(p)
  ) {
    return { kind: 'runtimes' };
  }
  if (p.includes('PrefixData')) return { kind: 'prefixes' };
  if (p.includes('BotMaker/Prices.json') || p.endsWith('BotMaker/Prices.json')) {
    return { kind: 'prices' };
  }
  if (p.includes('CommandsData/BotsCommands_') || /BotsCommands_\d+/.test(p)) {
    const m = p.match(/BotsCommands_(\d+)/);
    return { kind: 'commands', clientId: m ? m[1] : null };
  }

  // Token pools
  const pools = [
    ['UnusedTokens', 'unused'],
    ['WorkingTokens', 'working'],
    ['NonWorkingTokens', 'non_working'],
    ['ErrTokens', 'error'],
    ['Expired-Tokens', 'expired'],
    ['BotMakerTokens', 'botmaker'],
    ['ExpTokens', 'expiring'],
  ];
  for (const [needle, poolKind] of pools) {
    if (p.includes(needle)) return { kind: 'token_pool', poolKind };
  }

  // Platform namespaces (Database/*)
  const platformMap = [
    ['Aliases.json', 'aliases'],
    ['CommandStatus.json', 'command_status'],
    ['Language.json', 'language'],
    ['Building.json', 'building'],
    ['EnableChannels.json', 'enable_channels'],
    ['EnableRoles.json', 'enable_roles'],
    ['Expired.json', 'expired'],
    ['Voices.json', 'voices'],
    ['OwnerData', 'owner_data'],
    ['BotMaker/Data', 'botmaker_data'],
    ['BotMaker/Status', 'botmaker_status'],
    ['BotMaker/Logs', 'botmaker_logs'],
    ['BotMaker/Permissions', 'botmaker_permissions'],
    ['BotMaker/Access', 'botmaker_access'],
    ['BotMaker/Admins', 'botmaker_admins'],
    ['BotMaker/Blacklisted', 'botmaker_blacklist'],
    ['BotMaker/BotsBlacklisted', 'botmaker_bots_blacklisted'],
    ['BotMaker/Balance', 'botmaker_balance'],
    ['BotMaker/IDs', 'botmaker_ids'],
    ['BotMaker/ConfigStatus', 'botmaker_config_status'],
    ['BotMaker/Boosts', 'botmaker_boosts'],
    ['BotMaker/BuildBots', 'botmaker_build_bots'],
    ['BotMaker/Voices', 'botmaker_voices'],
    ['Dashboard/Access', 'dashboard_access_legacy'],
    ['Dashboard/BotAdmins', 'dashboard_bot_admins'],
    ['Dashboard/TwoFactor', 'dashboard_2fa'],
    ['Dashboard/AccountSecurity', 'dashboard_account_security'],
    ['Payments/Coins', 'payments_coins'],
    ['Payments/Transfers', 'payments_transfers'],
    ['Errors/Errors', 'errors'],
    ['Backups/Coins', 'backups_coins'],
    ['BuyerChecker', 'buyer_checker'],
  ];
  for (const [needle, ns] of platformMap) {
    if (p.includes(needle)) return { kind: 'platform', namespace: ns };
  }

  // Subscriptions DB
  if (p.includes('Subscriptions/Database')) {
    const base = path.basename(p, path.extname(p)).toLowerCase();
    return { kind: 'platform', namespace: `subs_${base}` };
  }

  // Fallback: derive namespace from filename
  const base = path.basename(p, path.extname(p)).toLowerCase().replace(/\W+/g, '_');
  if (p.includes('Json-Database') || p.includes('Database/')) {
    return { kind: 'platform', namespace: base || 'misc' };
  }

  return { kind: 'catalog' };
}

module.exports = { resolveStore, normalizePath };
