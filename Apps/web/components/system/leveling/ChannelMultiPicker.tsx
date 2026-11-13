'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';

export type GuildChannelOption = {
  id: string;
  name: string;
  type?: number;
};

type Labels = {
  search: string;
  addChannel: string;
  emptySelected: string;
  emptySearch: string;
  noChannels: string;
  selectedCount: string;
  remove: string;
};

export default function ChannelMultiPicker({
  channels,
  selectedIds,
  onChange,
  labels,
}: {
  channels: GuildChannelOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  labels: Labels;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const byId = useMemo(() => {
    const map = new Map<string, GuildChannelOption>();
    for (const c of channels) map.set(c.id, c);
    return map;
  }, [channels]);

  const selected = useMemo(
    () => selectedIds.map((id) => byId.get(id) || { id, name: id }),
    [selectedIds, byId],
  );

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return channels.filter((c) => {
      if (selectedIds.includes(c.id)) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.id.includes(q)) {
        return false;
      }
      return true;
    });
  }, [channels, selectedIds, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="ui-press inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold"
          onClick={() => setOpen((v) => !v)}
        >
          <Plus size={15} />
          {labels.addChannel}
        </button>
        <span className="text-xs text-muted-foreground">
          {labels.selectedCount.replace('{count}', String(selectedIds.length))}
        </span>
      </div>

      {open ? (
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <div className="relative mb-2">
            <Search
              size={14}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className="ui-input ps-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.search}
              aria-label={labels.search}
            />
          </div>
          {!channels.length ? (
            <p className="text-sm text-muted-foreground">{labels.noChannels}</p>
          ) : !available.length ? (
            <p className="text-sm text-muted-foreground">{labels.emptySearch}</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {available.slice(0, 40).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="ui-press flex w-full items-center rounded-lg px-2 py-1.5 text-start text-sm hover:bg-muted/60"
                    onClick={() => {
                      onChange([...selectedIds, c.id]);
                      setQuery('');
                      setOpen(false);
                    }}
                  >
                    #{c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {!selected.length ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          {labels.emptySelected}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {selected.map((c) => (
            <li
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm"
            >
              <span>#{c.name}</span>
              <button
                type="button"
                className="ui-press rounded-md p-0.5 text-muted-foreground hover:text-destructive"
                aria-label={labels.remove}
                onClick={() => onChange(selectedIds.filter((x) => x !== c.id))}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
