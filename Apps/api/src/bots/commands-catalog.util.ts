import * as fs from 'fs';
import * as path from 'path';

/** Master command catalog: Main/Resources/Commands.json */
export function resolveMasterCommandsPath(cwd = process.cwd()): string {
  return path.resolve(cwd, 'Main', 'Resources', 'Commands.json');
}

export function loadMasterCommandsCatalog(
  cwd = process.cwd(),
): Record<string, any> {
  const file = resolveMasterCommandsPath(cwd);
  try {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8') || '{}') || {};
  } catch {
    return {};
  }
}

/**
 * Same seed algorithm as Discord BotMaker purchase / Fix:
 * config commands + per-type command IDs from Commands.json.
 */
export function buildCommandsForBotType(
  typeRaw: string,
  master?: Record<string, any>,
): any[] {
  const catalog = master || loadMasterCommandsCatalog();
  const type = String(typeRaw || 'System').trim() || 'System';
  const out: any[] = [];

  const config = catalog.config;
  if (Array.isArray(config)) out.push(...config);

  if (type !== 'Custom') {
    const ids = catalog[type];
    if (Array.isArray(ids)) {
      for (const comId of ids) {
        const com = catalog[String(comId)];
        if (com) out.push(com);
      }
    }
  }

  return out;
}

export function commandsJsonFilePath(botId: string, cwd = process.cwd()): string {
  return path.resolve(
    cwd,
    'Database',
    'CommandsData',
    `BotsCommands_${botId}.json`,
  );
}

export function writeCommandsJsonFile(
  botId: string,
  commands: any[],
  cwd = process.cwd(),
): void {
  const file = commandsJsonFilePath(botId, cwd);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const payload = { [`commands_${botId}`]: commands };
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}
