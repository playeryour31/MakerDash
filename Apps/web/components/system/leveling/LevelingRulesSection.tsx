'use client';

import { useState } from 'react';
import { Ban, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { SectionCard, SelectField } from '@/components/apply/BotFormBits';
import EmptyState from '@/components/EmptyState';
import AutoRolePicker from '@/components/system/AutoRolePicker';
import ChannelMultiPicker from '@/components/system/leveling/ChannelMultiPicker';
import {
  uid,
  type LevelingDraft,
  type Multiplier,
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
  textChannels: Array<{ id: string; name: string; type?: number }>;
  guildRoles: GuildRole[];
  roleName: (id: string) => string;
  channelName: (id: string) => string;
  toastError: (msg: string) => void;
  discardLabel: string;
};

function targetTypeLabel(
  type: Multiplier['targetType'],
  L: any,
  s: any,
): string {
  if (type === 'role') return L.role || 'Role';
  if (type === 'channel') return L.channel || s.channel || 'Channel';
  return L.user || 'User';
}

export default function LevelingRulesSection({
  d,
  setDraft,
  L,
  s,
  textChannels,
  guildRoles,
  roleName,
  channelName,
  toastError,
  discardLabel,
}: Props) {
  const [editingMultiplier, setEditingMultiplier] = useState<Multiplier | null>(
    null,
  );

  return (
    <div className="space-y-4">
      <SectionCard
        title={L.multipliersTitle || 'XP multipliers'}
        icon={Layers}
        badge={d.multipliers.length}
        disabled={!d.enabled}
      >
        {!d.multipliers.length ? (
          <EmptyState
            icon={Layers}
            title={L.noMultipliers || 'No XP multipliers configured'}
            body={
              L.noMultipliersBody ||
              'Boost XP for roles, channels, or specific users.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-2 py-2 text-start font-medium">
                    {L.target || 'Target'}
                  </th>
                  <th className="px-2 py-2 text-start font-medium">
                    {L.multiplier || 'Multiplier'}
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
                {d.multipliers.map((m) => (
                  <tr key={m.id} className="border-b border-border/70">
                    <td className="px-2 py-2">
                      <span className="text-xs uppercase text-muted-foreground">
                        {targetTypeLabel(m.targetType, L, s)}
                      </span>
                      <div>
                        {m.targetType === 'role'
                          ? `@${roleName(m.targetId)}`
                          : m.targetType === 'channel'
                            ? `#${channelName(m.targetId)}`
                            : m.targetId}
                      </div>
                    </td>
                    <td className="px-2 py-2 tabular-nums">{m.multiplier}x</td>
                    <td className="px-2 py-2">
                      {m.enabled ? s.enabled : s.disabled}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="ui-press rounded-lg border border-border p-1.5"
                          onClick={() => setEditingMultiplier(m)}
                          aria-label={L.edit || 'Edit'}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="ui-press rounded-lg border border-border p-1.5 text-destructive"
                          onClick={() =>
                            setDraft({
                              ...d,
                              multipliers: d.multipliers.filter(
                                (x) => x.id !== m.id,
                              ),
                            })
                          }
                          aria-label={s.remove}
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
        )}
        <button
          type="button"
          className="ui-press mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
          onClick={() =>
            setEditingMultiplier({
              id: uid('m'),
              targetType: 'role',
              targetId: '',
              multiplier: 1.5,
              enabled: true,
            })
          }
        >
          <Plus size={15} />
          {L.addMultiplier || 'Add multiplier'}
        </button>

        {editingMultiplier ? (
          <div className="mt-4 space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <SelectField
              label={L.targetType || 'Target type'}
              value={editingMultiplier.targetType}
              onChange={(v) =>
                setEditingMultiplier({
                  ...editingMultiplier,
                  targetType: v === 'channel' || v === 'user' ? v : 'role',
                  targetId: '',
                })
              }
              options={[
                { value: 'role', label: L.role || 'Role' },
                { value: 'channel', label: L.channel || s.channel },
                { value: 'user', label: L.user || 'User' },
              ]}
            />
            {editingMultiplier.targetType === 'role' ? (
              <SelectField
                label={L.role || 'Role'}
                value={editingMultiplier.targetId}
                onChange={(v) =>
                  setEditingMultiplier({
                    ...editingMultiplier,
                    targetId: v,
                  })
                }
                options={[
                  { value: '', label: s.selectRole },
                  ...guildRoles
                    .filter((r) => !r.managed)
                    .map((r) => ({ value: r.id, label: r.name })),
                ]}
              />
            ) : null}
            {editingMultiplier.targetType === 'channel' ? (
              <SelectField
                label={s.channel}
                value={editingMultiplier.targetId}
                onChange={(v) =>
                  setEditingMultiplier({
                    ...editingMultiplier,
                    targetId: v,
                  })
                }
                options={[
                  { value: '', label: s.selectChannel },
                  ...textChannels.map((c) => ({
                    value: c.id,
                    label: `#${c.name}`,
                  })),
                ]}
              />
            ) : null}
            {editingMultiplier.targetType === 'user' ? (
              <label className="block text-sm">
                <span className="mb-1.5 block text-muted-foreground">
                  {L.userId || 'User ID'}
                </span>
                <input
                  className="ui-input font-mono text-xs"
                  value={editingMultiplier.targetId}
                  onChange={(e) =>
                    setEditingMultiplier({
                      ...editingMultiplier,
                      targetId: e.target.value,
                    })
                  }
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted-foreground">
                {L.multiplier || 'Multiplier'}
              </span>
              <input
                type="number"
                min={0.1}
                max={10}
                step={0.05}
                className="ui-input"
                value={editingMultiplier.multiplier}
                onChange={(e) =>
                  setEditingMultiplier({
                    ...editingMultiplier,
                    multiplier: Number(e.target.value || 1),
                  })
                }
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="ui-press rounded-xl border border-primary/40 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary"
                onClick={() => {
                  if (!editingMultiplier.targetId) {
                    toastError(L.needTarget || 'Select a target');
                    return;
                  }
                  const exists = d.multipliers.some(
                    (x) => x.id === editingMultiplier.id,
                  );
                  setDraft({
                    ...d,
                    multipliers: exists
                      ? d.multipliers.map((x) =>
                          x.id === editingMultiplier.id
                            ? editingMultiplier
                            : x,
                        )
                      : [...d.multipliers, editingMultiplier],
                  });
                  setEditingMultiplier(null);
                }}
              >
                {L.saveItem || 'Save'}
              </button>
              <button
                type="button"
                className="ui-press rounded-xl border border-border px-3 py-2 text-sm"
                onClick={() => setEditingMultiplier(null)}
              >
                {discardLabel}
              </button>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title={L.ignoredChannels || 'Ignored channels'}
        icon={Ban}
        disabled={!d.enabled}
      >
        <p className="mb-3 text-sm text-muted-foreground">
          {L.ignoredChannelsHint || 'Members earn no XP in these channels.'}
        </p>
        <ChannelMultiPicker
          channels={textChannels}
          selectedIds={d.ignoredChannelIds}
          onChange={(ignoredChannelIds) =>
            setDraft({ ...d, ignoredChannelIds })
          }
          labels={{
            search: L.searchChannels || 'Search channels…',
            addChannel: L.addChannel || 'Add channel',
            emptySelected:
              L.allChannelsEarn || 'All channels currently earn XP.',
            emptySearch: L.noChannelMatch || 'No channels match.',
            noChannels: L.noChannels || 'No channels available.',
            selectedCount: L.selectedChannelsCount || '{count} channels',
            remove: s.remove,
          }}
        />
      </SectionCard>

      <SectionCard
        title={L.ignoredRoles || 'Ignored roles'}
        icon={Ban}
        disabled={!d.enabled}
      >
        <p className="mb-3 text-sm text-muted-foreground">
          {L.ignoredRolesHint ||
            'Members with these roles do not receive XP.'}
        </p>
        <AutoRolePicker
          roles={guildRoles}
          selectedIds={d.ignoredRoleIds}
          onChange={(ignoredRoleIds) => setDraft({ ...d, ignoredRoleIds })}
          labels={{
            search: s.searchRoles,
            addRole: s.addRole,
            emptySelected:
              L.noIgnoredRoles || 'No ignored roles. Everyone can earn XP.',
            emptySearch: s.noRoleMatch,
            noRoles: s.noRoles,
            managedHint: s.managedRolesOnly,
            selectedCount: s.selectedRolesCount,
            remove: s.remove,
          }}
        />
      </SectionCard>
    </div>
  );
}
