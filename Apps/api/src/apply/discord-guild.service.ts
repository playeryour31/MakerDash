import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplyStoreService } from './apply-store.service';

export type GuildChannelOption = {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
};

export type GuildRoleOption = {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
};

export type GuildOptionsResult = {
  guildId: string;
  guildName: string | null;
  guildIcon: string | null;
  inGuild: boolean;
  code: 'OK' | 'NO_GUILD_CONFIGURED' | 'BOT_NOT_IN_GUILD' | 'DISCORD_ERROR';
  message?: string;
  channels: GuildChannelOption[];
  voiceChannels: GuildChannelOption[];
  roles: GuildRoleOption[];
  inviteUrl?: string | null;
};

function emptyOptions(
  guildId: string,
  code: GuildOptionsResult['code'],
  message?: string,
  inviteUrl?: string | null,
): GuildOptionsResult {
  return {
    guildId: guildId || '',
    guildName: null,
    guildIcon: null,
    inGuild: false,
    code,
    message,
    channels: [],
    voiceChannels: [],
    roles: [],
    inviteUrl: inviteUrl ?? null,
  };
}

function buildInviteUrl(clientId: string, guildId?: string | null) {
  const base = `https://discord.com/api/oauth2/authorize?client_id=${encodeURIComponent(
    String(clientId),
  )}&permissions=8&scope=bot%20applications.commands`;
  if (!guildId) return base;
  return `${base}&guild_id=${encodeURIComponent(String(guildId))}&disable_guild_select=true`;
}

@Injectable()
export class DiscordGuildService {
  constructor(private readonly store: ApplyStoreService) {}

  private async discordGet(path: string, token: string) {
    const res = await fetch(`https://discord.com/api/v10${path}`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      const err: any = new Error(
        `Discord API ${res.status}: ${text.slice(0, 200)}`,
      );
      err.status = res.status;
      err.body = text;
      throw err;
    }
    return res.json();
  }

  async getGuildOptions(botId: string, guildId: string): Promise<GuildOptionsResult> {
    const bot =
      (await this.store.getBotAsync(botId)) || this.store.getBot(botId);
    if (!bot?.Token) throw new NotFoundException('Bot token not found');

    const inviteUrl = buildInviteUrl(botId, guildId || null);

    if (!guildId) {
      return emptyOptions(
        '',
        'NO_GUILD_CONFIGURED',
        'No server ID was set for this bot at purchase.',
        inviteUrl,
      );
    }

    try {
      const [channelsRaw, rolesRaw, guild] = await Promise.all([
        this.discordGet(`/guilds/${guildId}/channels`, bot.Token),
        this.discordGet(`/guilds/${guildId}/roles`, bot.Token),
        this.discordGet(`/guilds/${guildId}`, bot.Token).catch(() => null),
      ]);

      // Text-like channels: GUILD_TEXT=0, GUILD_ANNOUNCEMENT=5, GUILD_FORUM=15
      const textTypes = new Set([0, 5, 15]);
      const allChannels = Array.isArray(channelsRaw) ? channelsRaw : [];
      const channels: GuildChannelOption[] = allChannels
        .filter((c: any) => textTypes.has(Number(c.type)))
        .map((c: any) => ({
          id: String(c.id),
          name: String(c.name || c.id),
          type: Number(c.type),
          parentId: c.parent_id ? String(c.parent_id) : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // GUILD_VOICE=2, GUILD_STAGE_VOICE=13
      const voiceTypes = new Set([2, 13]);
      const voiceChannels: GuildChannelOption[] = allChannels
        .filter((c: any) => voiceTypes.has(Number(c.type)))
        .map((c: any) => ({
          id: String(c.id),
          name: String(c.name || c.id),
          type: Number(c.type),
          parentId: c.parent_id ? String(c.parent_id) : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const roles: GuildRoleOption[] = (Array.isArray(rolesRaw) ? rolesRaw : [])
        .filter((r: any) => String(r.id) !== String(guildId)) // skip @everyone
        .map((r: any) => ({
          id: String(r.id),
          name: String(r.name || r.id),
          color: Number(r.color || 0),
          position: Number(r.position || 0),
          managed: Boolean(r.managed),
        }))
        .sort((a, b) => b.position - a.position);

      return {
        guildId,
        guildName: guild?.name || null,
        guildIcon: guild?.icon
          ? `https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png?size=64`
          : null,
        inGuild: true,
        code: 'OK',
        channels,
        voiceChannels,
        roles,
        inviteUrl,
      };
    } catch (err: any) {
      const status = Number(err?.status || 0);
      if (status === 403 || status === 404) {
        return emptyOptions(
          guildId,
          'BOT_NOT_IN_GUILD',
          'Bot is not in the configured server. Invite it to import channels and roles.',
          inviteUrl,
        );
      }
      throw new BadRequestException(
        err?.message || 'Failed to load guild options',
      );
    }
  }
}
