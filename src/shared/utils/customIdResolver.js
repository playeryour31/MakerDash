/**
 * Resolve a Discord component/command from a Collection based on `interaction.customId`.
 *
 * Existing codebase commonly encodes multiple "keys" in customId separated by `_`,
 * and then tries:
 *   collection.get(customId) OR collection.get(part0) OR collection.get(part1) ...
 */
function resolveByCustomId(collection, customId, { maxParts = 6, indexes } = {}) {
  if (!collection || typeof collection.get !== 'function') return undefined;
  if (!customId || typeof customId !== 'string') return undefined;

  const direct = collection.get(customId);
  if (direct) return direct;

  const segments = customId.split('_').map((p) => p.trim());
  const indexesToTry = Array.isArray(indexes)
    ? indexes
    : Array.from({ length: maxParts }, (_, i) => i);

  for (const i of indexesToTry) {
    const key = segments[i];
    if (!key) continue;
    const found = collection.get(key);
    if (found) return found;
  }

  return undefined;
}

module.exports = { resolveByCustomId };
