import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  shouldReadPostgres,
  shouldWriteJson,
  shouldWritePostgres,
} from '@maker/database';
import { publishPlatformKv } from '@maker/queue';
import { PlatformRepository } from '../prisma/repositories/platform.repository';
import { ApplyStoreService } from '../apply/apply-store.service';
import {
  buildCommandsForBotType,
  loadMasterCommandsCatalog,
  writeCommandsJsonFile,
} from './commands-catalog.util';

export type CommandAliasMeta = {
  alias: string;
  requirePrefix: boolean;
};

export type BotCommandMeta = {
  name: string;
  description: string;
  type: string;
  prefix: boolean;
  slash: boolean;
  prefixCommandName: string;
  slashCommandName: string;
  enabled: boolean;
  prefixEnabled: boolean;
  slashEnabled: boolean;
  allowedChannels: string[];
  allowedRoles: string[];
  requiredPermissions: string[];
  aliases: CommandAliasMeta[];
};

function aliasCommandOf(raw: any): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw);
  if (typeof raw === 'object')
    return String(raw.command || raw.commandName || '') || null;
  return null;
}

@Injectable()
export class CommandsStoreService {
  private commandsDir = path.resolve(process.cwd(), 'Database', 'CommandsData');
  private statusFile = path.resolve(
    process.cwd(),
    'Database',
    'Others',
    'CommandStatus.json',
  );
  private aliasesFile = path.resolve(
    process.cwd(),
    'Database',
    'Others',
    'Aliases.json',
  );
  private channelsFile = path.resolve(
    process.cwd(),
    'Database',
    'Others',
    'EnableChannels.json',
  );
  private rolesFile = path.resolve(
    process.cwd(),
    'Database',
    'Others',
    'EnableRoles.json',
  );
  private permissionsFile = path.resolve(
    process.cwd(),
    'Database',
    'BotMaker',
    'Permissions.json',
  );
  private prefixFile = path.resolve(
    process.cwd(),
    'Database',
    'Others',
    'PrefixData.json',
  );
  private catalogFile = path.resolve(
    process.cwd(),
    'Main',
    'Resources',
    'Commands.json',
  );

  constructor(
    private readonly platform: PlatformRepository,
    @Optional() private readonly store?: ApplyStoreService,
  ) {}

  private readJson(file: string): Record<string, any> {
    try {
      if (!fs.existsSync(file)) return {};
      return JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    } catch {
      return {};
    }
  }

  private writeJson(file: string, payload: Record<string, any>) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  }

  private notifyPlatformKv(
    namespace: string,
    key: string,
    value: any,
    deleted = false,
  ) {
    void publishPlatformKv({ namespace, key, value, deleted });
  }

  private catalogDescriptions(): Map<string, string> {
    const map = new Map<string, string>();
    const raw = this.readJson(this.catalogFile);
    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        for (const item of node) walk(item);
        return;
      }
      if (node.name || node.prefix_commandName) {
        const key = String(node.prefix_commandName || node.name || '');
        if (key && node.description) map.set(key, String(node.description));
      }
      for (const v of Object.values(node)) {
        if (v && typeof v === 'object') walk(v);
      }
    };
    walk(raw);
    return map;
  }

  private listRawCommandsJson(botId: string): any[] {
    const file = path.join(this.commandsDir, `BotsCommands_${botId}.json`);
    const raw = this.readJson(file);
    const list = raw[`commands_${botId}`];
    return Array.isArray(list) ? list : [];
  }

  private async listRawCommands(botId: string): Promise<any[]> {
    if (shouldReadPostgres()) {
      try {
        const cmds = await this.platform.getCommands(botId);
        if (cmds && cmds.length) return cmds;
      } catch {
        /* fall through */
      }
    }
    return this.listRawCommandsJson(botId);
  }

  /** Persist a command catalog for bots that were provisioned without one. */
  async ensureCommandsCatalog(
    botId: string,
    typeHint?: string,
  ): Promise<any[]> {
    const existing = await this.listRawCommands(botId);
    if (existing.length) return existing;

    let type = String(typeHint || '').trim();
    if (!type && this.store) {
      const bot =
        (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
      type = String(bot?.Type || bot?.type || '').trim();
    }
    if (!type) type = 'System';

    const master = loadMasterCommandsCatalog();
    const built = buildCommandsForBotType(type, master);
    if (!built.length) return [];

    if (shouldWritePostgres()) {
      try {
        await this.platform.setCommands(botId, built);
      } catch {
        /* continue — still try JSON */
      }
    }
    // Always mirror JSON so Maker file loaders see the catalog.
    writeCommandsJsonFile(botId, built);
    this.notifyPlatformKv('bot_commands', String(botId), built);

    return built;
  }

  private assertKnownCommand(rawList: any[], commandName: string) {
    const exists = rawList.some(
      (c: any) =>
        String(c.prefix_commandName || c.name) === String(commandName),
    );
    if (!exists) throw new NotFoundException(`Unknown command: ${commandName}`);
  }

  async getPrefix(botId: string): Promise<string> {
    if (shouldReadPostgres()) {
      try {
        const p = await this.platform.getPrefix(botId);
        if (p != null && String(p).length) return String(p);
      } catch {
        /* fall through */
      }
    }
    const raw = this.readJson(this.prefixFile);
    const value = raw[`Prefix_${botId}`];
    return value != null && String(value).length ? String(value) : '!';
  }

  private async statusMap(): Promise<Record<string, any>> {
    if (shouldReadPostgres()) {
      try {
        const map = await this.platform.getNamespaceMap('command_status');
        if (Object.keys(map).length) return map;
      } catch {
        /* fall through */
      }
    }
    return this.readJson(this.statusFile);
  }

  private async aliasesMap(): Promise<Record<string, any>> {
    if (shouldReadPostgres()) {
      try {
        const map = await this.platform.getNamespaceMap('aliases');
        if (Object.keys(map).length) return map;
      } catch {
        /* fall through */
      }
    }
    return this.readJson(this.aliasesFile);
  }

  private async channelsMap(): Promise<Record<string, any>> {
    if (shouldReadPostgres()) {
      try {
        const map = await this.platform.getNamespaceMap('enable_channels');
        if (Object.keys(map).length) return map;
      } catch {
        /* fall through */
      }
    }
    return this.readJson(this.channelsFile);
  }

  private async rolesMap(): Promise<Record<string, any>> {
    if (shouldReadPostgres()) {
      try {
        const map = await this.platform.getNamespaceMap('enable_roles');
        if (Object.keys(map).length) return map;
      } catch {
        /* fall through */
      }
    }
    return this.readJson(this.rolesFile);
  }

  private async permissionsMap(): Promise<Record<string, any>> {
    if (shouldReadPostgres()) {
      try {
        const map = await this.platform.getNamespaceMap('botmaker_permissions');
        if (Object.keys(map).length) return map;
      } catch {
        /* fall through */
      }
    }
    return this.readJson(this.permissionsFile);
  }

  private aliasesForBot(
    botId: string,
    raw: Record<string, any>,
  ): Map<string, CommandAliasMeta[]> {
    const byCommand = new Map<string, CommandAliasMeta[]>();
    const suffix = `_${botId}`;
    for (const [key, value] of Object.entries(raw)) {
      if (!key.endsWith(suffix)) continue;
      const alias = key.slice(0, -suffix.length);
      if (!alias) continue;
      const commandName = aliasCommandOf(value);
      if (!commandName) continue;
      const requirePrefix =
        typeof value === 'object' && value
          ? Boolean((value as any).requirePrefix)
          : false;
      const list = byCommand.get(commandName) || [];
      list.push({ alias: String(alias), requirePrefix });
      byCommand.set(commandName, list);
    }
    for (const [k, list] of byCommand) {
      list.sort((a, b) => a.alias.localeCompare(b.alias, 'ar'));
      byCommand.set(k, list);
    }
    return byCommand;
  }

  private modeEnabled(
    status: Record<string, any>,
    botId: string,
    cmdId: string,
    mode: 'prefix' | 'slash',
  ): boolean {
    const masterOn = status[`Status_${botId}_${cmdId}`] !== false;
    const modeKey =
      mode === 'prefix'
        ? `Status_prefix_${botId}_${cmdId}`
        : `Status_slash_${botId}_${cmdId}`;
    const modeVal = status[modeKey];
    if (modeVal === false) return false;
    if (modeVal === true) return true;
    return masterOn;
  }

  async listCommands(
    botId: string,
  ): Promise<{ prefix: string; commands: BotCommandMeta[] }> {
    let rawList = await this.listRawCommands(botId);
    if (!rawList.length) {
      rawList = await this.ensureCommandsCatalog(botId);
    }
    if (!rawList.length) {
      return { prefix: await this.getPrefix(botId), commands: [] };
    }

    const status = await this.statusMap();
    const aliases = this.aliasesForBot(botId, await this.aliasesMap());
    const channels = await this.channelsMap();
    const roles = await this.rolesMap();
    const perms = await this.permissionsMap();
    const descriptions = this.catalogDescriptions();
    const prefix = await this.getPrefix(botId);

    const commands: BotCommandMeta[] = rawList.map((c: any) => {
      const prefixCommandName = String(c.prefix_commandName || c.name || '');
      const slashCommandName = String(c.slash_commandName || '');
      // Bridge: slash-only can run via prefix; prefix-only (help) via slash wrappers
      const hasSlash = Boolean(c.slash) || Boolean(slashCommandName);
      const hasPrefix =
        Boolean(c.prefix) || Boolean(c.prefix_commandName) || hasSlash;
      const hasSlashMode =
        hasSlash || Boolean(c.prefix) || Boolean(c.prefix_commandName);

      const prefixEnabled = this.modeEnabled(
        status,
        botId,
        prefixCommandName,
        'prefix',
      );
      const slashEnabled = this.modeEnabled(
        status,
        botId,
        prefixCommandName,
        'slash',
      );
      const enabled = prefixEnabled || slashEnabled;

      const chKey = `Enable_${prefixCommandName}_${botId}`;
      const roleKey = `EnableRoles_${prefixCommandName}_${botId}`;
      const permKey = `CommandPermissions_${prefixCommandName}_${botId}`;
      const allowedChannels = Array.isArray(channels[chKey])
        ? channels[chKey].map(String)
        : [];
      const allowedRoles = Array.isArray(roles[roleKey])
        ? roles[roleKey].map(String)
        : [];
      const requiredPermissions = Array.isArray(perms[permKey])
        ? perms[permKey].map(String)
        : [];

      return {
        name: String(c.name || prefixCommandName),
        description:
          String(c.description || '') ||
          descriptions.get(prefixCommandName) ||
          '',
        type: String(c.type || 'Other'),
        prefix: hasPrefix,
        slash: hasSlashMode,
        prefixCommandName,
        slashCommandName: slashCommandName || (hasSlashMode ? prefixCommandName : ''),
        enabled,
        prefixEnabled,
        slashEnabled,
        allowedChannels,
        allowedRoles,
        requiredPermissions,
        aliases: [...(aliases.get(prefixCommandName) || [])].map((a) => ({
          alias: String(a.alias || ''),
          requirePrefix: Boolean(a.requirePrefix),
        })),
      };
    });

    commands.sort((a, b) => {
      const t = a.type.localeCompare(b.type, 'en');
      if (t !== 0) return t;
      return a.name.localeCompare(b.name, 'en');
    });

    return { prefix, commands };
  }

  /** Persist status: true/false store value; null deletes key. */
  private async persistStatusValue(key: string, value: boolean | null) {
    const status = await this.statusMap();
    if (value === null) delete status[key];
    else status[key] = value;
    if (shouldWriteJson()) this.writeJson(this.statusFile, status);
    if (shouldWritePostgres()) {
      if (value === null) await this.platform.delete('command_status', key);
      else await this.platform.set('command_status', key, value);
    }
    this.notifyPlatformKv(
      'command_status',
      key,
      value === null ? null : value,
      value === null,
    );
  }

  private async writeStatusKey(key: string, enabled: boolean) {
    // Legacy master: enabled → delete key; disabled → false
    await this.persistStatusValue(key, enabled ? null : false);
  }

  async setEnabled(botId: string, commandName: string, enabled: boolean) {
    const rawList = await this.listRawCommands(botId);
    this.assertKnownCommand(rawList, commandName);

    const key = `Status_${botId}_${commandName}`;
    await this.writeStatusKey(key, enabled);

    for (const mode of ['prefix', 'slash'] as const) {
      const mk = `Status_${mode}_${botId}_${commandName}`;
      const status = await this.statusMap();
      if (mk in status) {
        await this.persistStatusValue(mk, null);
      }
    }

    const emptyKey = `Status_${botId}_`;
    const status = await this.statusMap();
    if (status[emptyKey] != null) {
      await this.persistStatusValue(emptyKey, null);
    }
  }

  async setModeEnabled(
    botId: string,
    commandName: string,
    mode: 'prefix' | 'slash',
    enabled: boolean,
  ) {
    const rawList = await this.listRawCommands(botId);
    this.assertKnownCommand(rawList, commandName);

    const modeKey = `Status_${mode}_${botId}_${commandName}`;
    const otherMode = mode === 'prefix' ? 'slash' : 'prefix';
    const otherKey = `Status_${otherMode}_${botId}_${commandName}`;
    const masterKey = `Status_${botId}_${commandName}`;

    const before = await this.statusMap();
    const otherOnBefore = this.modeEnabled(
      before,
      botId,
      commandName,
      otherMode,
    );

    if (enabled) {
      // Explicit true — re-enable works even when master Status_* is false
      await this.persistStatusValue(modeKey, true);
      if (before[masterKey] === false) {
        await this.persistStatusValue(masterKey, null);
      }
      // Other mode was off via master only — pin it false after clearing master
      if (!otherOnBefore) {
        const after = await this.statusMap();
        if (after[otherKey] !== true) {
          await this.persistStatusValue(otherKey, false);
        }
      }
    } else {
      await this.persistStatusValue(modeKey, false);
      const status = await this.statusMap();
      const prefixOn = this.modeEnabled(status, botId, commandName, 'prefix');
      const slashOn = this.modeEnabled(status, botId, commandName, 'slash');
      if (!prefixOn && !slashOn) {
        await this.persistStatusValue(masterKey, false);
      }
    }
  }

  async setAllowedChannels(
    botId: string,
    commandName: string,
    channelIds: string[],
  ) {
    const rawList = await this.listRawCommands(botId);
    this.assertKnownCommand(rawList, commandName);
    const key = `Enable_${commandName}_${botId}`;
    const cleaned = [...new Set(channelIds.map(String).filter(Boolean))];
    const map = await this.channelsMap();
    if (!cleaned.length) {
      delete map[key];
      if (shouldWriteJson()) this.writeJson(this.channelsFile, map);
      if (shouldWritePostgres()) await this.platform.delete('enable_channels', key);
      this.notifyPlatformKv('enable_channels', key, null, true);
      return;
    }
    map[key] = cleaned;
    if (shouldWriteJson()) this.writeJson(this.channelsFile, map);
    if (shouldWritePostgres()) {
      await this.platform.set('enable_channels', key, cleaned);
    }
    this.notifyPlatformKv('enable_channels', key, cleaned, false);
  }

  async setAllowedRoles(botId: string, commandName: string, roleIds: string[]) {
    const rawList = await this.listRawCommands(botId);
    this.assertKnownCommand(rawList, commandName);
    const key = `EnableRoles_${commandName}_${botId}`;
    const cleaned = [...new Set(roleIds.map(String).filter(Boolean))];
    const map = await this.rolesMap();
    if (!cleaned.length) {
      delete map[key];
      if (shouldWriteJson()) this.writeJson(this.rolesFile, map);
      if (shouldWritePostgres()) await this.platform.delete('enable_roles', key);
      this.notifyPlatformKv('enable_roles', key, null, true);
      return;
    }
    map[key] = cleaned;
    if (shouldWriteJson()) this.writeJson(this.rolesFile, map);
    if (shouldWritePostgres()) {
      await this.platform.set('enable_roles', key, cleaned);
    }
    this.notifyPlatformKv('enable_roles', key, cleaned, false);
  }

  async setRequiredPermissions(
    botId: string,
    commandName: string,
    permissions: string[],
  ) {
    const rawList = await this.listRawCommands(botId);
    this.assertKnownCommand(rawList, commandName);
    const key = `CommandPermissions_${commandName}_${botId}`;
    const cleaned = [...new Set(permissions.map(String).filter(Boolean))];
    const map = await this.permissionsMap();
    if (!cleaned.length) {
      delete map[key];
      if (shouldWriteJson()) this.writeJson(this.permissionsFile, map);
      if (shouldWritePostgres()) {
        await this.platform.delete('botmaker_permissions', key);
      }
      this.notifyPlatformKv('botmaker_permissions', key, null, true);
      return;
    }
    map[key] = cleaned;
    if (shouldWriteJson()) this.writeJson(this.permissionsFile, map);
    if (shouldWritePostgres()) {
      await this.platform.set('botmaker_permissions', key, cleaned);
    }
    this.notifyPlatformKv('botmaker_permissions', key, cleaned, false);
  }

  async addAlias(
    botId: string,
    commandName: string,
    aliasRaw: string | string[],
    requirePrefix = false,
  ) {
    const alias = String(
      Array.isArray(aliasRaw) ? aliasRaw[0] ?? '' : aliasRaw || '',
    )
      .trim()
      .replace(/\s+/g, '');
    if (!alias) throw new BadRequestException('Alias is empty');
    if (alias.includes('_')) {
      throw new BadRequestException('Alias cannot contain underscore (_)');
    }

    const rawList = await this.listRawCommands(botId);
    this.assertKnownCommand(rawList, commandName);

    const aliases = await this.aliasesMap();
    const key = `${alias}_${botId}`;
    const currentCmd = aliasCommandOf(aliases[key]);
    if (currentCmd && currentCmd !== String(commandName)) {
      throw new BadRequestException(
        `Alias "${alias}" already used by ${currentCmd}`,
      );
    }

    const value = { command: commandName, requirePrefix: Boolean(requirePrefix) };
    aliases[key] = value;
    if (shouldWriteJson()) this.writeJson(this.aliasesFile, aliases);
    if (shouldWritePostgres()) {
      await this.platform.set('aliases', key, value);
    }
    this.notifyPlatformKv('aliases', key, value, false);
    return alias;
  }

  async removeAlias(botId: string, commandName: string, aliasRaw: string) {
    const alias = String(aliasRaw || '').trim();
    const aliases = await this.aliasesMap();
    const key = `${alias}_${botId}`;
    if (aliases[key] == null) return;
    const currentCmd = aliasCommandOf(aliases[key]);
    if (currentCmd !== String(commandName)) {
      throw new NotFoundException('Alias does not belong to this command');
    }
    delete aliases[key];
    if (shouldWriteJson()) this.writeJson(this.aliasesFile, aliases);
    if (shouldWritePostgres()) {
      await this.platform.delete('aliases', key);
    }
    this.notifyPlatformKv('aliases', key, null, true);
  }
}
