/**
 * Refresh BotCommandConfig entries for help/line slash dual-mode.
 * Run: node scripts/sync-command-dual-mode.js
 */
const { loadEnv } = require('./lib/load-env');
loadEnv();
const { prisma } = require('@maker/database');

const PATCHES = {
  help: {
    slash: true,
    slash_commandName: 'help',
    slash_fileName: 'help',
    prefix: true,
    prefix_commandName: 'help',
  },
  line: {
    slash: true,
    slash_commandName: 'line',
    slash_fileName: 'line',
    prefix: true,
    prefix_commandName: 'line',
  },
};

async function main() {
  const rows = await prisma.botCommandConfig.findMany();
  let updated = 0;
  for (const row of rows) {
    const cmds = Array.isArray(row.commands) ? [...row.commands] : [];
    let dirty = false;
    for (let i = 0; i < cmds.length; i++) {
      const c = cmds[i];
      if (!c || typeof c !== 'object') continue;
      const id = String(c.prefix_commandName || c.name || '');
      const patch = PATCHES[id];
      if (!patch) continue;
      cmds[i] = { ...c, ...patch };
      dirty = true;
    }
    // Also mark slash-only as prefix-capable for dashboard (bridge)
    for (let i = 0; i < cmds.length; i++) {
      const c = cmds[i];
      if (!c || typeof c !== 'object') continue;
      if (c.slash_commandName && !c.prefix_commandName && !c.prefix) {
        cmds[i] = { ...c, prefix: true };
        dirty = true;
      }
    }
    if (!dirty) continue;
    await prisma.botCommandConfig.update({
      where: { clientId: row.clientId },
      data: { commands: cmds },
    });
    updated++;
    console.log(`updated ${row.clientId}`);
  }
  console.log(`done, ${updated} bots`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
