'use client';

import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Trophy } from 'lucide-react';
import { SectionCard, SelectField } from '@/components/apply/BotFormBits';
import EmptyState from '@/components/EmptyState';
import {
  roleStackMode,
  uid,
  withRoleStackMode,
  type LevelingDraft,
  type Reward,
} from './types';

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
  roleName: (id: string) => string;
  toastError: (msg: string) => void;
  discardLabel: string;
};

function rewardTypeLabel(type: Reward['type'], L: any): string {
  return type === 'role'
    ? L.rewardRole || 'Discord role'
    : L.rewardMessage || 'Custom message';
}

export default function LevelingRewardsSection({
  d,
  setDraft,
  L,
  s,
  guildRoles,
  roleName,
  toastError,
  discardLabel,
}: Props) {
  const [rewardQuery, setRewardQuery] = useState('');
  const [rewardSort, setRewardSort] = useState<'level' | 'type'>('level');
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  const filteredRewards = useMemo(() => {
    const q = rewardQuery.trim().toLowerCase();
    let list = [...d.rewards];
    if (q) {
      list = list.filter(
        (r) =>
          String(r.level).includes(q) ||
          r.type.includes(q) ||
          rewardTypeLabel(r.type, L).toLowerCase().includes(q) ||
          r.value.toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          roleName(r.value).toLowerCase().includes(q),
      );
    }
    list.sort((a, b) =>
      rewardSort === 'type'
        ? a.type.localeCompare(b.type) || a.level - b.level
        : a.level - b.level,
    );
    return list;
  }, [d.rewards, rewardQuery, rewardSort, roleName, L]);

  return (
    <div className="space-y-4">
      <SectionCard
        title={L.roleStackTitle || 'Level role stacking'}
        icon={Trophy}
        disabled={!d.enabled}
      >
        <SelectField
          label={L.roleStackTitle || 'Level role stacking'}
          value={roleStackMode(d)}
          onChange={(v) =>
            setDraft(withRoleStackMode(d, v === 'replace' ? 'replace' : 'stack'))
          }
          options={[
            {
              value: 'replace',
              label: L.roleStackReplace || 'Replace previous roles',
            },
            {
              value: 'stack',
              label: L.roleStackStack || 'Stack roles',
            },
          ]}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {L.roleStackHint ||
            L.removePreviousRolesHint ||
            'Choose whether new level roles replace or stack with previous ones.'}
        </p>
      </SectionCard>

      <SectionCard
        title={L.rewardsTitle || 'Level rewards'}
        icon={Trophy}
        badge={d.rewards.length}
        disabled={!d.enabled}
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              className="ui-input"
              placeholder={L.searchRewards || 'Search rewards…'}
              value={rewardQuery}
              onChange={(e) => setRewardQuery(e.target.value)}
            />
          </div>
          <SelectField
            label=""
            value={rewardSort}
            onChange={(v) => setRewardSort(v === 'type' ? 'type' : 'level')}
            options={[
              { value: 'level', label: L.sortLevel || 'Sort by level' },
              { value: 'type', label: L.sortType || 'Sort by type' },
            ]}
          />
          <button
            type="button"
            className="ui-press inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
            onClick={() =>
              setEditingReward({
                id: uid('r'),
                level: 5,
                type: 'role',
                value: '',
                description: '',
                enabled: true,
              })
            }
          >
            <Plus size={15} />
            {L.addReward || 'Add reward'}
          </button>
        </div>

        {!filteredRewards.length ? (
          <EmptyState
            icon={Trophy}
            title={L.noRewards || 'No level rewards configured yet'}
            body={
              L.noRewardsBody ||
              'Add your first reward to start rewarding active members.'
            }
          />
        ) : (
          <div className="space-y-2 md:hidden">
            {filteredRewards.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {L.level || 'Level'} {r.level}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.type === 'role' ? `@${roleName(r.value)}` : r.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rewardTypeLabel(r.type, L)} ·{' '}
                      {r.enabled ? s.enabled : s.disabled}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="ui-press rounded-lg border border-border p-1.5"
                      onClick={() => setEditingReward(r)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="ui-press rounded-lg border border-border p-1.5 text-destructive"
                      onClick={() => {
                        if (
                          !window.confirm(
                            L.confirmDeleteReward || 'Delete this reward?',
                          )
                        ) {
                          return;
                        }
                        setDraft({
                          ...d,
                          rewards: d.rewards.filter((x) => x.id !== r.id),
                        });
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredRewards.length ? (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-2 py-2 text-start font-medium">
                    {L.level || 'Level'}
                  </th>
                  <th className="px-2 py-2 text-start font-medium">
                    {L.reward || 'Reward'}
                  </th>
                  <th className="px-2 py-2 text-start font-medium">
                    {L.type || 'Type'}
                  </th>
                  <th className="px-2 py-2 text-start font-medium">
                    {L.status || 'Status'}
                  </th>
                  <th className="px-2 py-2 text-end font-medium">
                    {L.actions || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRewards.map((r) => (
                  <tr key={r.id} className="border-b border-border/70">
                    <td className="px-2 py-2 tabular-nums">{r.level}</td>
                    <td className="px-2 py-2">
                      {r.type === 'role' ? `@${roleName(r.value)}` : r.value}
                      {r.description ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {r.description}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{rewardTypeLabel(r.type, L)}</td>
                    <td className="px-2 py-2">
                      {r.enabled ? s.enabled : s.disabled}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="ui-press rounded-lg border border-border p-1.5"
                          onClick={() => setEditingReward(r)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="ui-press rounded-lg border border-border p-1.5 text-destructive"
                          onClick={() => {
                            if (
                              !window.confirm(
                                L.confirmDeleteReward ||
                                  'Delete this reward?',
                              )
                            ) {
                              return;
                            }
                            setDraft({
                              ...d,
                              rewards: d.rewards.filter((x) => x.id !== r.id),
                            });
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {editingReward ? (
          <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block text-muted-foreground">
                  {L.level || 'Level'}
                </span>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  className="ui-input"
                  value={editingReward.level}
                  onChange={(e) =>
                    setEditingReward({
                      ...editingReward,
                      level: Number(e.target.value || 1),
                    })
                  }
                />
              </label>
              <SelectField
                label={L.type || 'Type'}
                value={editingReward.type}
                onChange={(v) =>
                  setEditingReward({
                    ...editingReward,
                    type: v === 'message' ? 'message' : 'role',
                    value: '',
                  })
                }
                options={[
                  { value: 'role', label: L.rewardRole || 'Discord role' },
                  {
                    value: 'message',
                    label: L.rewardMessage || 'Custom message',
                  },
                ]}
              />
              {editingReward.type === 'role' ? (
                <SelectField
                  label={L.role || 'Role'}
                  value={editingReward.value}
                  onChange={(v) =>
                    setEditingReward({ ...editingReward, value: v })
                  }
                  options={[
                    { value: '', label: s.selectRole },
                    ...guildRoles
                      .filter((r) => !r.managed)
                      .map((r) => ({ value: r.id, label: r.name })),
                  ]}
                />
              ) : (
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1.5 block text-muted-foreground">
                    {L.rewardMessage || 'Custom message'}
                  </span>
                  <input
                    className="ui-input"
                    value={editingReward.value}
                    onChange={(e) =>
                      setEditingReward({
                        ...editingReward,
                        value: e.target.value,
                      })
                    }
                  />
                </label>
              )}
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1.5 block text-muted-foreground">
                  {L.description || 'Description (optional)'}
                </span>
                <input
                  className="ui-input"
                  value={editingReward.description}
                  onChange={(e) =>
                    setEditingReward({
                      ...editingReward,
                      description: e.target.value,
                    })
                  }
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {L.roleHierarchyHint ||
                'The bot role must sit above reward roles in Discord settings.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="ui-press rounded-xl border border-primary/40 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary"
                onClick={() => {
                  if (!editingReward.value) {
                    toastError(L.needRewardValue || 'Set a reward value');
                    return;
                  }
                  const exists = d.rewards.some(
                    (x) => x.id === editingReward.id,
                  );
                  setDraft({
                    ...d,
                    rewards: exists
                      ? d.rewards.map((x) =>
                          x.id === editingReward.id ? editingReward : x,
                        )
                      : [...d.rewards, editingReward],
                  });
                  setEditingReward(null);
                }}
              >
                {L.saveItem || 'Save'}
              </button>
              <button
                type="button"
                className="ui-press rounded-xl border border-border px-3 py-2 text-sm"
                onClick={() => setEditingReward(null)}
              >
                {discardLabel}
              </button>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
