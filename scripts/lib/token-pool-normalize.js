'use strict';

/**
 * Normalizes every historical token-pool file shape into a list of tokens.
 *
 * Supported shapes:
 *   { "Tokens":  ["<token>", ...] }
 *   { "TOKENS":  ["<token>", ...] }
 *   { "tokens":  [{ token, reason }, ...] }
 *   { "Subscriptions": [{ Token, ClientID }, ...] }
 *   { "<token>": [{ id, username }, ...] }   (old WorkingTokens map)
 *   ["<token>", ...]
 */

const DISCORD_TOKEN =
  /^[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{25,45}$/;

const KNOWN_LIST_KEYS = [
  'Tokens',
  'TOKENS',
  'tokens',
  'Subscriptions',
  'Bots',
  'items',
  'data',
];

const TOKEN_VALUE_KEYS = [
  'token',
  'Token',
  'TOKEN',
  'access_token',
  'accessToken',
];

function tokenFromValue(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  for (const key of TOKEN_VALUE_KEYS) {
    if (typeof value[key] === 'string') return value[key];
  }
  return null;
}

/**
 * @param {unknown} raw parsed JSON
 * @returns {{ tokens: string[], unique: string[], invalid: string[], source: string }}
 */
function normalizePool(raw) {
  const tokens = [];
  const invalid = [];
  const sources = [];

  const push = (value) => {
    const token = tokenFromValue(value);
    if (!token) return;
    const trimmed = String(token).trim();
    if (!trimmed) return;
    if (DISCORD_TOKEN.test(trimmed)) tokens.push(trimmed);
    else invalid.push(trimmed);
  };

  const pushList = (list) => {
    if (!Array.isArray(list)) return false;
    for (const item of list) push(item);
    return true;
  };

  if (Array.isArray(raw)) {
    sources.push('bare-array');
    pushList(raw);
  } else if (raw && typeof raw === 'object') {
    for (const key of KNOWN_LIST_KEYS) {
      if (pushList(raw[key])) sources.push(`key:${key}`);
    }

    // Old format: the token itself is the object key.
    let mapHits = 0;
    for (const key of Object.keys(raw)) {
      if (!DISCORD_TOKEN.test(key)) continue;
      tokens.push(key);
      mapHits += 1;
    }
    if (mapHits) sources.push('token-map');

    if (!sources.length) {
      // Last resort: flatten every array property.
      for (const [key, value] of Object.entries(raw)) {
        if (pushList(value)) sources.push(`key:${key}`);
      }
    }
  }

  const unique = [...new Set(tokens)];
  return {
    tokens,
    unique,
    invalid,
    source: sources.length ? sources.join('+') : 'unknown',
  };
}

module.exports = { DISCORD_TOKEN, normalizePool, tokenFromValue };
