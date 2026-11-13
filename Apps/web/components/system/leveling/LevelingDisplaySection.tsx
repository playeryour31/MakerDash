'use client';

import { ListOrdered, Sparkles } from 'lucide-react';
import { SectionCard, SelectField } from '@/components/apply/BotFormBits';
import UiSwitch from '@/components/UiSwitch';
import AutoRolePicker from '@/components/system/AutoRolePicker';
import type { LevelingDraft } from './types';

type GuildRole = {
  id: string;
  name: string;
  color?: number;
  managed?: boolean;
};

type Props = {
  d: LevelingDraft;
  setDraft: (d: LevelingDraft) => void;
  L: any;
  s: any;
  guildRoles: GuildRole[];
  locale: string;
};

export default function LevelingDisplaySection({
  d,
  setDraft,
  L,
  s,
  guildRoles,
  locale,
}: Props) {
  const maxCurveXp = Math.max(
    1,
    ...(d.curvePreview || []).map((p) => p.xpToNext),
  );

  const curveOptions = [
    { value: 'linear', label: L.curveLinear || 'Linear' },
    {
      value: 'progressive',
      label: L.curveProgressive || 'Progressive',
    },
    ...(d.curveMode === 'custom'
      ? [
          {
            value: 'custom',
            label: `${L.curveCustom || 'Custom'} (${L.notSet || 'legacy'})`,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <SectionCard
        title={L.curveTitle || 'Level curve'}
        icon={ListOrdered}
        disabled={!d.enabled}
      >
        {d.curveMode === 'custom' ? (
          <p className="mb-3 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            {L.curveCustomHidden ||
              'Custom curves are no longer editable here. Switch to Linear or Progressive to continue.'}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField
            label={L.curveMode || 'XP formula'}
            value={d.curveMode}
            onChange={(v) =>
              setDraft({
                ...d,
                curveMode:
                  v === 'linear'
                    ? 'linear'
                    : v === 'progressive'
                      ? 'progressive'
                      : 'progressive',
              })
            }
            options={curveOptions}
          />
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              {L.curveBaseXp || 'Base XP'}
            </span>
            <input
              type="number"
              min={10}
              max={100000}
              className="ui-input"
              value={d.curveBaseXp}
              onChange={(e) =>
                setDraft({
                  ...d,
                  curveBaseXp: Number(e.target.value || 100),
                })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              {L.curveGrowth || 'Growth multiplier'}
            </span>
            <input
              type="number"
              min={1}
              max={5}
              step={0.05}
              className="ui-input"
              value={d.curveGrowth}
              disabled={d.curveMode === 'linear'}
              onChange={(e) =>
                setDraft({
                  ...d,
                  curveGrowth: Number(e.target.value || 1.45),
                })
              }
            />
          </label>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted-foreground">
            {L.curvePreview || 'XP required per level (preview)'}
          </p>
          <div className="flex h-32 items-end gap-1 rounded-xl border border-border bg-muted/20 p-3">
            {(d.curvePreview || []).slice(0, 20).map((p) => (
              <div
                key={p.level}
                className="flex flex-1 flex-col items-center justify-end gap-1"
                title={`L${p.level}: ${p.xpToNext} XP`}
              >
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{
                    height: `${Math.max(8, (p.xpToNext / maxCurveXp) * 100)}%`,
                  }}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {L.curvePreviewHint ||
              'Save settings to refresh the server-side curve preview.'}
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title={L.rankCardTitle || 'Rank card'}
        icon={Sparkles}
        disabled={!d.enabled}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm">
            {L.enableRankCard || 'Enable rank cards'}
          </span>
          <UiSwitch
            checked={d.rankCard.enabled}
            onCheckedChange={(next) =>
              setDraft({
                ...d,
                rankCard: { ...d.rankCard, enabled: next },
              })
            }
            showLabel={false}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ['backgroundColor', L.bgColor || 'Background'],
              ['accentColor', L.accentColor || 'Accent'],
              ['textColor', L.textColor || 'Text'],
              ['progressColor', L.progressColor || 'Progress bar'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1.5 block text-muted-foreground">
                {label}
              </span>
              <input
                type="color"
                className="h-10 w-full cursor-pointer rounded-xl border border-border bg-secondary"
                value={d.rankCard[key]}
                onChange={(e) =>
                  setDraft({
                    ...d,
                    rankCard: { ...d.rankCard, [key]: e.target.value },
                  })
                }
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="mb-1.5 block text-muted-foreground">
              {L.bgOpacity || 'Background opacity'}
            </span>
            <input
              type="number"
              min={0}
              max={100}
              className="ui-input"
              value={d.rankCard.backgroundOpacity}
              onChange={(e) =>
                setDraft({
                  ...d,
                  rankCard: {
                    ...d.rankCard,
                    backgroundOpacity: Number(e.target.value || 100),
                  },
                })
              }
            />
          </label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(
            [
              ['showAvatar', L.showAvatar || 'Avatar'],
              ['showUsername', L.showUsername || 'Username'],
              ['showLevel', L.showLevel || 'Level'],
              ['showXp', L.showXp || 'XP'],
              ['showRank', L.showRank || 'Rank position'],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
            >
              <span className="text-sm">{label}</span>
              <UiSwitch
                checked={Boolean(d.rankCard[key])}
                onCheckedChange={(next) =>
                  setDraft({
                    ...d,
                    rankCard: { ...d.rankCard, [key]: next },
                  })
                }
                showLabel={false}
              />
            </div>
          ))}
        </div>
        <div
          className="mt-4 overflow-hidden rounded-2xl border border-border p-4"
          style={{
            background: d.rankCard.backgroundColor,
            color: d.rankCard.textColor,
          }}
        >
          <p className="mb-2 text-xs opacity-70">
            {L.rankPreview || 'Live preview'}
          </p>
          <div className="flex items-center gap-4">
            {d.rankCard.showAvatar ? (
              <div
                className="h-16 w-16 shrink-0 rounded-full"
                style={{ background: d.rankCard.accentColor }}
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                {d.rankCard.showUsername ? (
                  <p className="truncate font-display text-lg font-semibold">
                    {locale === 'ar' ? 'أمينة' : 'Amina'}
                  </p>
                ) : null}
                {d.rankCard.showLevel ? (
                  <p className="text-sm font-semibold">LEVEL 12</p>
                ) : null}
              </div>
              {d.rankCard.showRank ? (
                <p className="text-xs opacity-70">RANK #4</p>
              ) : null}
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full w-2/3 rounded-full"
                  style={{ background: d.rankCard.progressColor }}
                />
              </div>
              {d.rankCard.showXp ? (
                <p className="mt-2 text-xs opacity-70">
                  320 / 480 XP · Total 4820
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={L.leaderboardTitle || 'Leaderboard'}
        icon={ListOrdered}
        disabled={!d.enabled}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
            <span className="text-sm">
              {L.enableLeaderboard || 'Enable leaderboard'}
            </span>
            <UiSwitch
              checked={d.leaderboard.enabled}
              onCheckedChange={(next) =>
                setDraft({
                  ...d,
                  leaderboard: { ...d.leaderboard, enabled: next },
                })
              }
              showLabel={false}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
            <span className="text-sm">
              {L.publicLeaderboard || 'Public leaderboard'}
            </span>
            <UiSwitch
              checked={d.leaderboard.isPublic}
              onCheckedChange={(next) =>
                setDraft({
                  ...d,
                  leaderboard: { ...d.leaderboard, isPublic: next },
                })
              }
              showLabel={false}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label={L.sortBy || 'Default sorting'}
              value={d.leaderboard.sortBy}
              onChange={(v) =>
                setDraft({
                  ...d,
                  leaderboard: {
                    ...d.leaderboard,
                    sortBy: v === 'level' ? 'level' : 'xp',
                  },
                })
              }
              options={[
                { value: 'xp', label: 'XP' },
                { value: 'level', label: L.level || 'Level' },
              ]}
            />
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted-foreground">
                {L.displayCount || 'Users displayed'}
              </span>
              <input
                type="number"
                min={3}
                max={25}
                className="ui-input"
                value={d.leaderboard.displayCount}
                onChange={(e) =>
                  setDraft({
                    ...d,
                    leaderboard: {
                      ...d.leaderboard,
                      displayCount: Number(e.target.value || 10),
                    },
                  })
                }
              />
            </label>
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              {L.excludedRoles || 'Excluded roles'}
            </p>
            <AutoRolePicker
              roles={guildRoles}
              selectedIds={d.leaderboard.excludedRoleIds}
              onChange={(excludedRoleIds) =>
                setDraft({
                  ...d,
                  leaderboard: { ...d.leaderboard, excludedRoleIds },
                })
              }
              labels={{
                search: s.searchRoles,
                addRole: s.addRole,
                emptySelected:
                  L.noExcludedRoles || 'No roles excluded from the board.',
                emptySearch: s.noRoleMatch,
                noRoles: s.noRoles,
                managedHint: s.managedRolesOnly,
                selectedCount: s.selectedRolesCount,
                remove: s.remove,
              }}
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
