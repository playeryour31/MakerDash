'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';

export type GuildRoleOption = {
  id: string;
  name: string;
  color?: number;
  managed?: boolean;
};

type Labels = {
  search: string;
  addRole: string;
  emptySelected: string;
  emptySearch: string;
  noRoles: string;
  managedHint: string;
  selectedCount: string;
  remove: string;
};

function roleColor(color?: number) {
  const n = Number(color || 0);
  if (!n) return '#9494a8';
  return `#${n.toString(16).padStart(6, '0')}`;
}

export default function AutoRolePicker({
  roles,
  selectedIds,
  onChange,
  labels,
}: {
  roles: GuildRoleOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  labels: Labels;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const byId = useMemo(() => {
    const map = new Map<string, GuildRoleOption>();
    for (const r of roles) map.set(r.id, r);
    return map;
  }, [roles]);

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => byId.get(id) || { id, name: id })
        .filter(Boolean),
    [selectedIds, byId],
  );

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles.filter((r) => {
      if (r.managed) return false;
      if (selectedIds.includes(r.id)) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [roles, selectedIds, query]);

  const assignableCount = roles.filter((r) => !r.managed).length;

  function add(id: string) {
    if (selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
    setQuery('');
    setOpen(false);
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  if (!roles.length) {
    return <p className="text-sm text-muted-foreground">{labels.noRoles}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {labels.selectedCount.replace('{count}', String(selected.length))}
        </p>
      </div>

      {selected.length ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((role) => (
            <li key={role.id}>
              <span
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 py-1 ps-2.5 pe-1 text-sm"
                style={{
                  borderColor: `${roleColor(role.color)}55`,
                  background: `${roleColor(role.color)}14`,
                }}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: roleColor(role.color) }}
                  aria-hidden
                />
                <span className="max-w-[12rem] truncate font-medium">
                  {role.name}
                </span>
                <button
                  type="button"
                  className="ui-press rounded-full p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(role.id)}
                  aria-label={`${labels.remove} ${role.name}`}
                >
                  <X size={13} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          {labels.emptySelected}
        </p>
      )}

      {open ? (
        <div className="rounded-xl border border-border bg-background/50 p-2">
          <label className="relative block">
            <Search
              size={14}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              autoFocus
              className="ui-input w-full ps-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.search}
            />
          </label>
          <ul className="mt-2 max-h-52 overflow-y-auto">
            {available.length === 0 ? (
              <li className="px-2 py-3 text-xs text-muted-foreground">
                {assignableCount === 0 ? labels.managedHint : labels.emptySearch}
              </li>
            ) : (
              available.map((role) => (
                <li key={role.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-start text-sm hover:bg-muted/50"
                    onClick={() => add(role.id)}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: roleColor(role.color) }}
                      aria-hidden
                    />
                    <span className="truncate">{role.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : (
        <button
          type="button"
          className="ui-press inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
          onClick={() => setOpen(true)}
        >
          <Plus size={15} />
          {labels.addRole}
        </button>
      )}
    </div>
  );
}
