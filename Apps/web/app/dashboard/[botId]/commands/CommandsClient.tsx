"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ChevronDown,
  Hash,
  Plus,
  Search,
  Slash,
  Terminal,
  X,
} from "lucide-react";
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
} from "@/components/apply/BotFormBits";
import UnsavedChangesBar from "@/components/UnsavedChangesBar";
import UiSwitch from "@/components/UiSwitch";
import ChannelMultiPicker, {
  type GuildChannelOption,
} from "@/components/system/leveling/ChannelMultiPicker";
import AutoRolePicker, {
  type GuildRoleOption,
} from "@/components/system/AutoRolePicker";
import { useToast } from "@/hooks/useToast";
import { ApiError, api } from "@/lib/api";
import { useI18n } from "@/lib/i18n/I18nProvider";

type CommandAlias = {
  alias: string;
  requirePrefix: boolean;
};

type BotCommand = {
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
  aliases: CommandAlias[];
};

type CommandsResponse = {
  botId: string;
  prefix: string;
  commands: BotCommand[];
};

type GuildOptions = {
  channels?: GuildChannelOption[];
  roles?: GuildRoleOption[];
};

const PERMISSION_OPTIONS = [
  "Administrator",
  "ManageGuild",
  "ManageChannels",
  "ManageRoles",
  "KickMembers",
  "BanMembers",
  "ModerateMembers",
  "ManageMessages",
  "MentionEveryone",
  "EmbedLinks",
  "AttachFiles",
  "SendMessages",
  "ViewChannel",
  "ViewAuditLog",
];

function aliasLabel(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(aliasLabel).filter(Boolean).join("");
  }
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("alias" in o) return aliasLabel(o.alias);
    if ("command" in o) return "";
  }
  return "";
}

function normalizeAliases(
  list: BotCommand["aliases"] | string[] | unknown,
): CommandAlias[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((a) => {
      if (typeof a === "string" || typeof a === "number") {
        return { alias: String(a), requirePrefix: false };
      }
      if (Array.isArray(a)) {
        const label = aliasLabel(a);
        return label
          ? { alias: label, requirePrefix: false }
          : { alias: "", requirePrefix: false };
      }
      if (a && typeof a === "object") {
        const o = a as Record<string, unknown>;
        return {
          alias: aliasLabel(o.alias),
          requirePrefix: Boolean(o.requirePrefix),
        };
      }
      return { alias: "", requirePrefix: false };
    })
    .filter((a) => Boolean(a.alias) && !a.alias.includes("_"));
}

function cloneCommands(list: BotCommand[]): BotCommand[] {
  return list.map((c) => ({
    ...c,
    aliases: normalizeAliases(c.aliases).map((a) => ({ ...a })),
    allowedChannels: [...(c.allowedChannels || [])],
    allowedRoles: [...(c.allowedRoles || [])],
    requiredPermissions: [...(c.requiredPermissions || [])],
    prefixEnabled: c.prefixEnabled !== false,
    slashEnabled: c.slashEnabled !== false,
  }));
}

function sameCommands(a: BotCommand[], b: BotCommand[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function CommandsClient() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("!");
  const [saved, setSaved] = useState<BotCommand[]>([]);
  const [draft, setDraft] = useState<BotCommand[]>([]);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [aliasDrafts, setAliasDrafts] = useState<Record<string, string>>({});
  const [aliasRequirePrefix, setAliasRequirePrefix] = useState<
    Record<string, boolean>
  >({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [guildChannels, setGuildChannels] = useState<GuildChannelOption[]>([]);
  const [guildRoles, setGuildRoles] = useState<GuildRoleOption[]>([]);
  const [guildOptsState, setGuildOptsState] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");

  const load = useCallback(async () => {
    if (!botId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api<CommandsResponse>(`/bots/${botId}/commands`);
      const list = cloneCommands(res.commands || []);
      setPrefix(res.prefix || "!");
      setSaved(list);
      setDraft(cloneCommands(list));
      setAliasDrafts({});
      setAliasRequirePrefix({});
      setExpanded(new Set());
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 404
          ? t.commandsPage.loadEmpty
          : t.commandsPage.loadFailed;
      setLoadError(msg);
      setSaved([]);
      setDraft([]);
    } finally {
      setLoading(false);
    }
  }, [botId, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!botId) return;
    let cancelled = false;
    setGuildOptsState("loading");
    api<GuildOptions>(`/apply/${botId}/guild-options`)
      .then((res) => {
        if (cancelled) return;
        setGuildChannels(Array.isArray(res.channels) ? res.channels : []);
        setGuildRoles(Array.isArray(res.roles) ? res.roles : []);
        setGuildOptsState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setGuildChannels([]);
        setGuildRoles([]);
        setGuildOptsState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [botId]);

  const isDirty = useMemo(() => !sameCommands(saved, draft), [saved, draft]);

  const types = useMemo(() => {
    const set = new Set(draft.map((c) => c.type).filter(Boolean));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [draft]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return draft.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (!q) return true;
      const hay = [
        c.name,
        c.description,
        c.prefixCommandName,
        c.slashCommandName,
        c.type,
        ...c.aliases.map((a) => aliasLabel(a?.alias)),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [draft, query, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, BotCommand[]>();
    for (const c of filtered) {
      const key = c.type || "Other";
      const list = map.get(key) || [];
      list.push(c);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updateCommand(
    commandName: string,
    updater: (c: BotCommand) => BotCommand,
  ) {
    setDraft((prev) =>
      prev.map((c) => (c.prefixCommandName === commandName ? updater(c) : c)),
    );
  }

  function syncMaster(c: BotCommand): BotCommand {
    const prefixEnabled = c.prefix ? c.prefixEnabled : false;
    const slashEnabled = c.slash ? c.slashEnabled : false;
    const enabled =
      (c.prefix ? prefixEnabled : false) || (c.slash ? slashEnabled : false);
    return { ...c, prefixEnabled, slashEnabled, enabled };
  }

  function togglePrefix(commandName: string) {
    updateCommand(commandName, (c) =>
      syncMaster({ ...c, prefixEnabled: !c.prefixEnabled }),
    );
  }

  function toggleSlash(commandName: string) {
    updateCommand(commandName, (c) =>
      syncMaster({ ...c, slashEnabled: !c.slashEnabled }),
    );
  }

  function toggleCommandEnabled(commandName: string) {
    updateCommand(commandName, (c) => {
      const next = !c.enabled;
      const prefixEnabled = c.prefix ? next : false;
      const slashEnabled = c.slash ? next : false;
      const enabled =
        (c.prefix ? prefixEnabled : false) || (c.slash ? slashEnabled : false);
      return { ...c, prefixEnabled, slashEnabled, enabled };
    });
  }

  function addAlias(commandName: string) {
    const raw = (aliasDrafts[commandName] || "").trim().replace(/\s+/g, "");
    if (!raw) {
      toast.error(t.commandsPage.aliasEmpty);
      return;
    }
    if (raw.includes("_")) {
      toast.error(t.commandsPage.aliasNoUnderscore);
      return;
    }
    const cmd = draft.find((c) => c.prefixCommandName === commandName);
    if (!cmd) return;
    if (cmd.aliases.some((a) => a.alias === raw)) {
      toast.error(t.commandsPage.aliasExists);
      return;
    }
    const taken = draft.find(
      (c) =>
        c.prefixCommandName !== commandName &&
        c.aliases.some((a) => a.alias === raw),
    );
    if (taken) {
      toast.error(`${t.commandsPage.aliasTaken} ${taken.name}`);
      return;
    }
    const requirePrefix = Boolean(aliasRequirePrefix[commandName]);
    updateCommand(commandName, (c) => ({
      ...c,
      aliases: [...c.aliases, { alias: raw, requirePrefix }].sort((a, b) =>
        aliasLabel(a.alias).localeCompare(aliasLabel(b.alias), "ar"),
      ),
    }));
    setAliasDrafts((prev) => ({ ...prev, [commandName]: "" }));
  }

  function removeAlias(commandName: string, alias: string) {
    updateCommand(commandName, (c) => ({
      ...c,
      aliases: c.aliases.filter((a) => a.alias !== alias),
    }));
  }

  function toggleAliasRequirePrefix(commandName: string, alias: string) {
    updateCommand(commandName, (c) => ({
      ...c,
      aliases: c.aliases.map((a) =>
        a.alias === alias ? { ...a, requirePrefix: !a.requirePrefix } : a,
      ),
    }));
  }

  function togglePermission(commandName: string, perm: string) {
    updateCommand(commandName, (c) => {
      const has = c.requiredPermissions.includes(perm);
      return {
        ...c,
        requiredPermissions: has
          ? c.requiredPermissions.filter((p) => p !== perm)
          : [...c.requiredPermissions, perm],
      };
    });
  }

  async function save() {
    if (!botId || !isDirty) return;
    setSaving(true);
    try {
      const savedMap = new Map(
        saved.map((c) => [c.prefixCommandName, c] as const),
      );
      const updates: {
        commandName: string;
        enabled?: boolean;
        prefixEnabled?: boolean;
        slashEnabled?: boolean;
      }[] = [];
      const add: {
        commandName: string;
        alias: string;
        requirePrefix?: boolean;
      }[] = [];
      const remove: { commandName: string; alias: string }[] = [];
      const channels: { commandName: string; channelIds: string[] }[] = [];
      const roles: { commandName: string; roleIds: string[] }[] = [];
      const permissions: { commandName: string; permissions: string[] }[] = [];

      for (const c of draft) {
        const prev = savedMap.get(c.prefixCommandName);
        if (!prev) continue;

        if (
          prev.enabled !== c.enabled ||
          prev.prefixEnabled !== c.prefixEnabled ||
          prev.slashEnabled !== c.slashEnabled
        ) {
          updates.push({
            commandName: c.prefixCommandName,
            enabled: c.enabled,
            prefixEnabled: c.prefixEnabled,
            slashEnabled: c.slashEnabled,
          });
        }

        const prevAliasMap = new Map(
          prev.aliases.map((a) => [a.alias, a] as const),
        );
        for (const a of c.aliases) {
          const old = prevAliasMap.get(a.alias);
          if (!old) {
            add.push({
              commandName: c.prefixCommandName,
              alias: a.alias,
              requirePrefix: a.requirePrefix,
            });
          } else if (old.requirePrefix !== a.requirePrefix) {
            remove.push({
              commandName: c.prefixCommandName,
              alias: a.alias,
            });
            add.push({
              commandName: c.prefixCommandName,
              alias: a.alias,
              requirePrefix: a.requirePrefix,
            });
          }
        }
        for (const a of prev.aliases) {
          if (!c.aliases.some((x) => x.alias === a.alias)) {
            remove.push({
              commandName: c.prefixCommandName,
              alias: a.alias,
            });
          }
        }

        if (
          JSON.stringify(prev.allowedChannels) !==
          JSON.stringify(c.allowedChannels)
        ) {
          channels.push({
            commandName: c.prefixCommandName,
            channelIds: c.allowedChannels,
          });
        }

        if (
          JSON.stringify(prev.allowedRoles) !== JSON.stringify(c.allowedRoles)
        ) {
          roles.push({
            commandName: c.prefixCommandName,
            roleIds: c.allowedRoles,
          });
        }

        if (
          JSON.stringify(prev.requiredPermissions) !==
          JSON.stringify(c.requiredPermissions)
        ) {
          permissions.push({
            commandName: c.prefixCommandName,
            permissions: c.requiredPermissions,
          });
        }
      }

      const res = await api<CommandsResponse>(`/bots/${botId}/commands`, {
        method: "PATCH",
        body: JSON.stringify({
          updates,
          aliases: { add, remove },
          channels,
          roles,
          permissions,
        }),
      });
      const list = cloneCommands(res.commands || []);
      setSaved(list);
      setDraft(cloneCommands(list));
      setAliasDrafts({});
      setAliasRequirePrefix({});
      toast.success(t.commandsPage.saved);
    } catch {
      toast.error(t.commandsPage.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <BotPageSkeleton />;
  if (loadError) {
    return <BotLoadError message={loadError} onRetry={() => void load()} />;
  }

  const channelPickerLabels = {
    search: t.commandsPage.channelsSearch,
    addChannel: t.commandsPage.channelAdd,
    emptySelected: t.commandsPage.channelsEmpty,
    emptySearch: t.commandsPage.channelsEmptySearch,
    noChannels: t.commandsPage.channelsNone,
    selectedCount: t.commandsPage.channelsSelected,
    remove: t.commandsPage.removeItem,
  };

  const rolePickerLabels = {
    search: t.commandsPage.rolesSearch,
    addRole: t.commandsPage.roleAdd,
    emptySelected: t.commandsPage.rolesEmpty,
    emptySearch: t.commandsPage.rolesEmptySearch,
    noRoles: t.commandsPage.rolesNone,
    managedHint: t.commandsPage.rolesManagedHint,
    selectedCount: t.commandsPage.rolesSelected,
    remove: t.commandsPage.removeItem,
  };

  return (
    <main className="dashboard-page space-y-5 pb-24">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t.commandsPage.title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t.commandsPage.subtitle}
        </p>
      </header>

      <SectionCard title={t.commandsPage.searchFilter} icon={Search}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.commandsPage.searchPlaceholder}
              className="w-full rounded-xl border border-border bg-secondary py-2 pe-3 ps-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {type === "all" ? t.commandsPage.searchFilter : type}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {t.commandsPage.prefix}: <code className="font-mono">{prefix}</code>
          </p>
        </div>
        {guildOptsState === "loading" ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {t.commandsPage.guildOptsLoading}
          </p>
        ) : null}
        {guildOptsState === "failed" ? (
          <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400">
            {t.commandsPage.guildOptsFailed}
          </p>
        ) : null}
      </SectionCard>

      {grouped.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {t.commandsPage.noMatch}
        </p>
      ) : (
        grouped.map(([type, commands]) => (
          <section key={type} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Terminal size={15} className="text-primary" />
              <h2 className="font-display text-sm font-semibold tracking-wide">
                {type}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {commands.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {commands.map((cmd) => {
                const key = cmd.prefixCommandName;
                const isOpen = expanded.has(key);
                const channelCount = cmd.allowedChannels.length;
                const roleCount = cmd.allowedRoles.length;
                const permCount = cmd.requiredPermissions.length;
                const aliasCount = cmd.aliases.length;

                return (
                  <article
                    key={key}
                    className={`group/card overflow-hidden rounded-2xl border bg-card/95 backdrop-blur-[2px] transition-[border-color,box-shadow,transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      cmd.enabled
                        ? isOpen
                          ? "border-primary/45 shadow-lg shadow-primary/10 -translate-y-px"
                          : "border-border/90 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
                        : "border-border/60 opacity-65"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(key)}
                      aria-expanded={isOpen}
                      className="group flex w-full items-start justify-between gap-3 px-4 py-3.5 text-start transition-colors duration-200 hover:bg-muted/25 active:bg-muted/35"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          className={`mt-1.5 flex h-2 w-2 shrink-0 rounded-full transition-all duration-300 ${
                            cmd.enabled
                              ? "bg-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_22%,transparent)]"
                              : "bg-muted-foreground/35"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-mono text-sm font-semibold tracking-tight">
                              {cmd.name}
                            </h3>
                            {cmd.prefix ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/35 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors group-hover/card:border-primary/20">
                                <Hash size={10} />
                                {prefix}
                                {cmd.prefixCommandName}
                              </span>
                            ) : null}
                            {cmd.slash && cmd.slashCommandName ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/35 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors group-hover/card:border-primary/20">
                                <Slash size={10} />/{cmd.slashCommandName}
                              </span>
                            ) : null}
                          </div>

                          {cmd.description ? (
                            <p
                              className={`mt-1 text-xs leading-relaxed text-muted-foreground transition-[max-height] duration-300 ${
                                isOpen ? "" : "line-clamp-1"
                              }`}
                            >
                              {cmd.description}
                            </p>
                          ) : null}

                          {!isOpen ? (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {channelCount > 0 ? (
                                <span className="rounded-md bg-muted/55 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {channelCount} {t.commandsPage.channelsTitle}
                                </span>
                              ) : null}
                              {roleCount > 0 ? (
                                <span className="rounded-md bg-muted/55 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {roleCount} {t.commandsPage.rolesTitle}
                                </span>
                              ) : null}
                              {permCount > 0 ? (
                                <span className="rounded-md bg-muted/55 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {permCount} {t.commandsPage.permsTitle}
                                </span>
                              ) : null}
                              {aliasCount > 0 ? (
                                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                                  {aliasCount} {t.commandsPage.aliasTitle}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        <span onClick={(e) => e.stopPropagation()}>
                          <UiSwitch
                            checked={cmd.enabled}
                            onCheckedChange={() => toggleCommandEnabled(key)}
                            label={t.commandsPage.enabledOf}
                            aria-label={t.commandsPage.enabledOf}
                          />
                        </span>
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                            isOpen
                              ? "bg-primary/15 text-primary scale-105"
                              : "text-muted-foreground group-hover:bg-muted/60"
                          }`}
                        >
                          <ChevronDown
                            size={15}
                            className={`transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </span>
                      </div>
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div
                          className={`space-y-4 border-t border-border/60 px-4 pb-4 pt-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            isOpen
                              ? "translate-y-0 opacity-100 delay-75"
                              : "-translate-y-2 opacity-0"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5">
                            <p className="w-full text-[11px] font-semibold text-muted-foreground sm:w-auto">
                              {t.commandsPage.enabledOf}
                            </p>
                            {cmd.prefix ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                  <Hash size={12} />
                                  {t.commandsPage.prefixEnabled}
                                </span>
                                <UiSwitch
                                  checked={cmd.prefixEnabled}
                                  onCheckedChange={() => togglePrefix(key)}
                                  label={t.commandsPage.prefixEnabled}
                                  aria-label={t.commandsPage.prefixEnabled}
                                />
                              </div>
                            ) : null}
                            {cmd.slash ? (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                  <Slash size={12} />
                                  {t.commandsPage.slashEnabled}
                                </span>
                                <UiSwitch
                                  checked={cmd.slashEnabled}
                                  onCheckedChange={() => toggleSlash(key)}
                                  label={t.commandsPage.slashEnabled}
                                  aria-label={t.commandsPage.slashEnabled}
                                />
                              </div>
                            ) : null}
                          </div>

                          <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                              {t.commandsPage.channelsTitle}
                            </p>
                            <ChannelMultiPicker
                              channels={guildChannels}
                              selectedIds={cmd.allowedChannels}
                              onChange={(ids) =>
                                updateCommand(key, (c) => ({
                                  ...c,
                                  allowedChannels: ids,
                                }))
                              }
                              labels={channelPickerLabels}
                            />
                            <p className="mt-2 text-[10px] text-muted-foreground">
                              {t.commandsPage.channelsHint}
                            </p>
                          </div>

                          <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                              {t.commandsPage.rolesTitle}
                            </p>
                            <AutoRolePicker
                              roles={guildRoles}
                              selectedIds={cmd.allowedRoles}
                              onChange={(ids) =>
                                updateCommand(key, (c) => ({
                                  ...c,
                                  allowedRoles: ids,
                                }))
                              }
                              labels={rolePickerLabels}
                            />
                            <p className="mt-2 text-[10px] text-muted-foreground">
                              {t.commandsPage.rolesHint}
                            </p>
                          </div>

                          <div>
                            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                              {t.commandsPage.permsTitle}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {PERMISSION_OPTIONS.map((perm) => {
                                const on =
                                  cmd.requiredPermissions.includes(perm);
                                return (
                                  <button
                                    key={perm}
                                    type="button"
                                    onClick={() => togglePermission(key, perm)}
                                    className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition-all duration-200 ${
                                      on
                                        ? "border-primary/30 bg-primary/10 text-primary scale-[1.02]"
                                        : "border-border text-muted-foreground hover:bg-muted/50"
                                    }`}
                                  >
                                    {perm}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {cmd.prefix ? (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                                {t.commandsPage.aliasTitle}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {cmd.aliases.map((a) => {
                                  const label = aliasLabel(a?.alias);
                                  if (!label) return null;
                                  return (
                                    <span
                                      key={label}
                                      className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary"
                                    >
                                      <code>{label}</code>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleAliasRequirePrefix(key, label)
                                        }
                                        className="rounded border border-primary/20 px-1 text-[9px] hover:bg-primary/20"
                                        title={t.commandsPage.requirePrefix}
                                      >
                                        {a.requirePrefix
                                          ? `${prefix}${label}`
                                          : label}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeAlias(key, label)}
                                        className="rounded p-0.5 hover:bg-primary/20"
                                        aria-label={`${t.commandsPage.deleteAlias} ${label}`}
                                      >
                                        <X size={12} />
                                      </button>
                                    </span>
                                  );
                                })}
                                <div className="inline-flex flex-wrap items-center gap-1">
                                  <input
                                    value={aliasDrafts[key] || ""}
                                    onChange={(e) =>
                                      setAliasDrafts((prev) => ({
                                        ...prev,
                                        [key]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        addAlias(key);
                                      }
                                    }}
                                    placeholder={
                                      t.commandsPage.aliasPlaceholder
                                    }
                                    className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-[11px] outline-none ring-primary/30 transition focus:ring-1"
                                  />
                                  <label className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(aliasRequirePrefix[key])}
                                      onChange={(e) =>
                                        setAliasRequirePrefix((prev) => ({
                                          ...prev,
                                          [key]: e.target.checked,
                                        }))
                                      }
                                    />
                                    {t.commandsPage.requirePrefix}
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => addAlias(key)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium transition hover:bg-muted/60"
                                  >
                                    <Plus size={12} />
                                    {t.commandsPage.aliasAdd}
                                  </button>
                                </div>
                              </div>
                              <p className="mt-1.5 text-[10px] text-muted-foreground">
                                {t.commandsPage.aliasHint}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

      <UnsavedChangesBar
        open={isDirty}
        saving={saving}
        onSave={save}
        onDiscard={() => {
          setDraft(cloneCommands(saved));
          setAliasDrafts({});
          setAliasRequirePrefix({});
        }}
      />
    </main>
  );
}
