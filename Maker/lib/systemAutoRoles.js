/**
 * Assign dashboard System auto-roles (sys_auto_roles) when a member joins.
 */
const featureDb = require('./featureDb');

async function loadAutoRoleSettings(botId) {
  const id = String(botId);
  try {
    const { prisma } = require('@maker/database');
    const row = await prisma.featureRecord.findUnique({
      where: {
        namespace_key: { namespace: 'sys_auto_roles', key: id },
      },
    });
    if (row?.value && typeof row.value === 'object') {
      try {
        const cache = require('../../src/shared/services/featureCache');
        if (typeof cache.prime === 'function') {
          cache.prime('sys_auto_roles', id, row.value);
        }
      } catch {
        /* optional */
      }
      return row.value;
    }
  } catch (err) {
    console.warn(`[auto-roles] prisma read: ${err.message}`);
  }
  return featureDb('sys_auto_roles').get(id) || null;
}

async function applySystemAutoRoles(client, member) {
  if (!client?.user?.id || !member?.guild) return;
  if (member.user?.bot) return;

  const settings = await loadAutoRoleSettings(client.user.id);
  if (!settings || !settings.enabled) return;

  const roleIds = Array.isArray(settings.roleIds)
    ? settings.roleIds.map(String).filter(Boolean)
    : [];
  if (!roleIds.length) return;

  const me =
    member.guild.members.me ||
    (await member.guild.members.fetchMe().catch(() => null));
  const myHighest = me?.roles?.highest?.position ?? 0;

  const toAdd = [];
  for (const id of roleIds) {
    let role =
      member.guild.roles.cache.get(id) ||
      (await member.guild.roles.fetch(id).catch(() => null));
    if (!role || role.managed || role.id === member.guild.id) continue;
    if (member.roles.cache.has(role.id)) continue;
    if (role.position >= myHighest) {
      console.warn(
        `[auto-roles] skip ${role.id}: higher than bot role in ${member.guild.id}`,
      );
      continue;
    }
    toAdd.push(role.id);
  }

  if (!toAdd.length) return;

  try {
    await member.roles.add(toAdd, 'System auto-roles');
  } catch (err) {
    console.warn(
      `[auto-roles] ${client.user.id} failed for ${member.id}: ${err.message}`,
    );
  }
}

module.exports = { applySystemAutoRoles, loadAutoRoleSettings };
