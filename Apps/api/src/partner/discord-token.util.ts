/**
 * Resolve Discord bot application user id from a bot token.
 * Errors intentionally omit Discord response bodies (may leak token details).
 */
export async function resolveBotClientIdFromToken(
  token: string,
): Promise<{ clientId: string; username?: string }> {
  const res = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bot ${String(token).trim()}` },
  });
  if (!res.ok) {
    throw new Error(`Discord token validation failed (${res.status})`);
  }
  const data = (await res.json()) as {
    id?: string;
    username?: string;
    bot?: boolean;
  };
  if (!data?.id) {
    throw new Error('Discord token validation returned no user id');
  }
  if (data.bot === false) {
    throw new Error('Token is not a Discord bot token');
  }
  return { clientId: String(data.id), username: data.username };
}
