export function isBotAdminRole(user: any): boolean {
  return String(user?.role || '') === 'bot-admin';
}

export function userOwnsBot(
  user: any,
  clientId: string,
  opts: {
    tokenOwner?: string | null;
    tokenBuyer?: string | null;
    accessOwnerId?: string | null;
  } = {},
): boolean {
  if (!user?.sub) return false;
  // Admins never get owner privileges via botIds fallback.
  if (isBotAdminRole(user)) return false;

  const discordId = String(user.sub);
  if (opts.tokenOwner && String(opts.tokenOwner) === discordId) return true;
  if (opts.tokenBuyer && String(opts.tokenBuyer) === discordId) return true;
  if (opts.accessOwnerId && String(opts.accessOwnerId) === discordId) return true;

  const ids = Array.isArray(user.botIds) ? user.botIds.map(String) : [];
  return ids.includes(String(clientId));
}

/** Owner or accepted dashboard admin for this bot. */
export function userCanAccessBot(
  user: any,
  clientId: string,
  opts: {
    tokenOwner?: string | null;
    tokenBuyer?: string | null;
    accessOwnerId?: string | null;
    isAcceptedAdmin?: boolean;
  } = {},
): boolean {
  if (userOwnsBot(user, clientId, opts)) return true;
  if (opts.isAcceptedAdmin) return true;

  const adminIds = Array.isArray(user?.adminBotIds)
    ? user.adminBotIds.map(String)
    : [];
  if (adminIds.includes(String(clientId))) return true;

  return false;
}

/** Accept/reject applications only — owners and admins. */
export function userCanDecideApplications(
  user: any,
  clientId: string,
  opts: {
    tokenOwner?: string | null;
    tokenBuyer?: string | null;
    accessOwnerId?: string | null;
    isAcceptedAdmin?: boolean;
  } = {},
): boolean {
  return userCanAccessBot(user, clientId, opts);
}
