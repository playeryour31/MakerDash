'use client';

import { useState } from 'react';
import { ChevronDown, Gauge, Shield, Sparkles, Trophy, Volume2 } from 'lucide-react';
import { SectionCard, SelectField } from '@/components/apply/BotFormBits';
import UiSwitch from '@/components/UiSwitch';
import { fillPreview, type LevelingDraft, type TabKey } from './types';

type Props = {
  d: LevelingDraft;
  setDraft: (d: LevelingDraft) => void;
  L: any;
  s: any;
  textChannels: Array<{ id: string; name: string; type?: number }>;
  channelName: (id: string) => string;
  onNavigate: (tab: TabKey) => void;
};

export default function LevelingSetupSection({
  d,
  setDraft,
  L,
  s,
  textChannels,
  channelName,
  onNavigate,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const ov = d.overview || {};

  const tiles: Array<{
    key: string;
    label: string;
    value: string;
    nav: TabKey | null;
  }> = [
    {
      key: 'status',
      label: L.status || s.statusCard,
      value: d.enabled ? s.enabled : s.disabled,
      nav: null,
    },
    {
      key: 'xpRange',
      label: L.xpRange || 'XP / message',
      value: `${d.xpMin} – ${d.xpMax}`,
      nav: 'setup',
    },
    {
      key: 'cooldown',
      label: s.cooldownSeconds,
      value: `${d.cooldownSeconds}s`,
      nav: 'setup',
    },
    {
      key: 'rewards',
      label: L.rewardsCount || 'Rewards',
      value: String(ov.rewardsCount ?? d.rewards.length),
      nav: 'rewards',
    },
    {
      key: 'multipliers',
      label: L.multipliersCount || 'Multipliers',
      value: String(ov.multipliersCount ?? d.multipliers.length),
      nav: 'rules',
    },
    {
      key: 'channel',
      label: s.levelChannel,
      value:
        d.levelUpMode === 'disabled'
          ? s.disabled
          : d.levelUpMode === 'current'
            ? L.currentChannel || 'Current channel'
            : d.channelId
              ? `#${channelName(d.channelId)}`
              : L.notSet || 'Not set',
      nav: 'setup',
    },
  ];

  return (
    <div className="space-y-4">
      <SectionCard title={L.overviewTitle || s.overviewTitle} icon={Trophy}>
        <p className="mb-3 text-xs text-muted-foreground">
          {L.overviewHint || 'Tap a card to jump to related settings'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((card) => (
            <button
              key={card.key}
              type="button"
              disabled={card.nav === null}
              onClick={() => {
                if (card.nav) onNavigate(card.nav);
              }}
              className={`rounded-xl border border-border bg-muted/20 px-4 py-3 text-start transition ${
                card.nav
                  ? 'cursor-pointer hover:border-primary/40 hover:bg-muted/40'
                  : 'cursor-default'
              }`}
            >
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="mt-1 font-display text-lg font-semibold tabular-nums">
                {card.value}
              </p>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={s.levelingSettings}
        icon={Sparkles}
        disabled={!d.enabled}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label={L.levelUpMode || 'Level-up notifications'}
            value={d.levelUpMode}
            onChange={(v) =>
              setDraft({
                ...d,
                levelUpMode:
                  v === 'disabled' || v === 'current' || v === 'channel'
                    ? v
                    : 'channel',
              })
            }
            options={[
              { value: 'disabled', label: s.disabled },
              {
                value: 'current',
                label: L.currentChannel || 'Current channel',
              },
              {
                value: 'channel',
                label: L.specificChannel || 'Specific channel',
              },
            ]}
          />
          {d.levelUpMode === 'channel' ? (
            <SelectField
              label={s.levelChannel}
              value={d.channelId}
              onChange={(v) => setDraft({ ...d, channelId: v })}
              options={[
                { value: '', label: s.selectChannel },
                ...textChannels.map((c) => ({
                  value: c.id,
                  label: `#${c.name}`,
                })),
              ]}
            />
          ) : null}
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block text-muted-foreground">
              {L.levelUpMessage || 'Level-up message'}
            </span>
            <textarea
              className="ui-input min-h-[6rem]"
              value={d.levelUpMessage}
              maxLength={1000}
              onChange={(e) =>
                setDraft({ ...d, levelUpMessage: e.target.value })
              }
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              {L.placeholdersHint ||
                'Placeholders: {user} {username} {level} {xp} {server}'}
            </span>
          </label>
          <div className="rounded-xl border border-border bg-muted/20 p-3 sm:col-span-2">
            <p className="mb-1 text-xs text-muted-foreground">
              {L.livePreview || 'Live preview'}
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {fillPreview(d.levelUpMessage)}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={L.messageXp || 'Message XP'}
        icon={Gauge}
        disabled={!d.enabled}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              {L.xpMin || 'Minimum XP'}
            </span>
            <input
              type="number"
              min={1}
              max={500}
              className="ui-input"
              value={d.xpMin}
              onChange={(e) =>
                setDraft({
                  ...d,
                  xpMin: Number(e.target.value || 1),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              {L.xpMax || 'Maximum XP'}
            </span>
            <input
              type="number"
              min={1}
              max={500}
              className="ui-input"
              value={d.xpMax}
              onChange={(e) =>
                setDraft({
                  ...d,
                  xpMax: Number(e.target.value || 1),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              {s.cooldownSeconds}
            </span>
            <input
              type="number"
              min={0}
              max={3600}
              className="ui-input"
              value={d.cooldownSeconds}
              onChange={(e) =>
                setDraft({
                  ...d,
                  cooldownSeconds: Number(e.target.value || 0),
                })
              }
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title={L.voiceXp || 'Voice XP'}
        icon={Volume2}
        disabled={!d.enabled}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {d.voiceXpEnabled ? s.enabled : s.disabled}
          </span>
          <UiSwitch
            checked={d.voiceXpEnabled}
            onCheckedChange={(next) =>
              setDraft({ ...d, voiceXpEnabled: next })
            }
            showLabel={false}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              {L.voiceXpPerMinute || 'XP per minute'}
            </span>
            <input
              type="number"
              min={0}
              max={100}
              className="ui-input"
              value={d.voiceXpPerMinute}
              disabled={!d.voiceXpEnabled}
              onChange={(e) =>
                setDraft({
                  ...d,
                  voiceXpPerMinute: Number(e.target.value || 0),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              {L.voiceMinUsers || 'Minimum users in channel'}
            </span>
            <input
              type="number"
              min={1}
              max={99}
              className="ui-input"
              value={d.voiceMinUsers}
              disabled={!d.voiceXpEnabled}
              onChange={(e) =>
                setDraft({
                  ...d,
                  voiceMinUsers: Number(e.target.value || 1),
                })
              }
            />
          </label>
        </div>
        <div className="mt-3 space-y-2">
          {(
            [
              ['voiceIgnoreAfk', L.ignoreAfk || 'Ignore AFK channels'],
              ['voiceIgnoreMuted', L.ignoreMuted || 'Ignore muted users'],
              [
                'voiceIgnoreDeafened',
                L.ignoreDeafened || 'Ignore deafened users',
              ],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
            >
              <span className="text-sm">{label}</span>
              <UiSwitch
                checked={Boolean(d[key])}
                disabled={!d.voiceXpEnabled}
                onCheckedChange={(next) => setDraft({ ...d, [key]: next })}
                showLabel={false}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="rounded-xl border border-border bg-card">
        <button
          type="button"
          className="ui-press flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Shield size={16} className="text-muted-foreground" />
            {L.advancedToggle || L.tabAdvanced || L.antiSpamTitle || 'Advanced'}
          </span>
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition ${
              advancedOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {advancedOpen ? (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <SectionCard
              title={L.antiSpamTitle || 'Anti-spam / XP protection'}
              icon={Shield}
              disabled={!d.enabled}
            >
              <div className="space-y-2">
                {(
                  [
                    [
                      'duplicateMessageProtection',
                      L.dupProtection || 'Duplicate message protection',
                    ],
                    ['ignoreBots', L.ignoreBots || 'Ignore bot users'],
                    [
                      'ignoreWebhooks',
                      L.ignoreWebhooks || 'Ignore webhooks',
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                  >
                    <span className="text-sm">{label}</span>
                    <UiSwitch
                      checked={Boolean(d.antiSpam[key])}
                      onCheckedChange={(next) =>
                        setDraft({
                          ...d,
                          antiSpam: { ...d.antiSpam, [key]: next },
                        })
                      }
                      showLabel={false}
                    />
                  </div>
                ))}
                <label className="block text-sm">
                  <span className="mb-1.5 block text-muted-foreground">
                    {L.minMessageLength || 'Minimum message length'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    className="ui-input"
                    value={d.antiSpam.minMessageLength}
                    onChange={(e) =>
                      setDraft({
                        ...d,
                        antiSpam: {
                          ...d.antiSpam,
                          minMessageLength: Number(e.target.value || 0),
                        },
                      })
                    }
                  />
                </label>
              </div>
            </SectionCard>
          </div>
        ) : null}
      </div>
    </div>
  );
}
