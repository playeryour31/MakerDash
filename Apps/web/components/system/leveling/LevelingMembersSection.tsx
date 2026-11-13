'use client';

import { Users } from 'lucide-react';
import { SectionCard } from '@/components/apply/BotFormBits';
import EmptyState from '@/components/EmptyState';
import type { LevelingUser } from './types';

type Props = {
  L: any;
  users: LevelingUser[];
  usersQuery: string;
  setUsersQuery: (q: string) => void;
  userAmount: string;
  setUserAmount: (v: string) => void;
  usersLoading: boolean;
  userActionBusy: string | null;
  loadUsers: () => void | Promise<void>;
  mutateUser: (
    userId: string,
    action: 'add_xp' | 'remove_xp' | 'set_xp' | 'set_level' | 'reset',
  ) => void | Promise<void>;
};

export default function LevelingMembersSection({
  L,
  users,
  usersQuery,
  setUsersQuery,
  userAmount,
  setUserAmount,
  usersLoading,
  userActionBusy,
  loadUsers,
  mutateUser,
}: Props) {
  return (
    <SectionCard title={L.usersTitle || 'XP administration'} icon={Users}>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1 text-sm">
          <span className="mb-1.5 block text-muted-foreground">
            {L.searchUsers || 'Search by user ID…'}
          </span>
          <input
            className="ui-input w-full"
            placeholder={L.searchUsers || 'Search by user ID…'}
            value={usersQuery}
            onChange={(e) => setUsersQuery(e.target.value)}
          />
        </label>
        <label className="block text-sm sm:w-36">
          <span className="mb-1.5 block text-muted-foreground">
            {L.amount || 'Amount'}
          </span>
          <input
            className="ui-input w-full"
            type="number"
            min={0}
            value={userAmount}
            onChange={(e) => setUserAmount(e.target.value)}
            aria-label={L.amount || 'Amount'}
          />
          <span className="mt-1 block text-[10px] text-muted-foreground">
            {L.amountHint ||
              'Used with add / remove / set XP or set level'}
          </span>
        </label>
        <button
          type="button"
          className="ui-press rounded-xl border border-border px-3 py-2 text-sm font-semibold"
          onClick={() => void loadUsers()}
        >
          {L.search || 'Search'}
        </button>
      </div>
      {usersLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : !users.length ? (
        <EmptyState
          icon={Users}
          title={L.noUsers || 'No XP records yet'}
          body={
            L.noUsersBody ||
            'Members appear here after they earn XP in the server.'
          }
        />
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li
              key={u.userId}
              className="rounded-xl border border-border bg-muted/20 p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {u.userId}
                  </p>
                  <p className="text-sm">
                    Lv.{u.level} · {u.xp} XP
                    {u.rank != null ? ` · #${u.rank}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {u.progressXp}/{u.xpToNext} to next
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['add_xp', L.addXp || 'Add XP'],
                      ['remove_xp', L.removeXp || 'Remove XP'],
                      ['set_xp', L.setXp || 'Set XP'],
                      ['set_level', L.setLevel || 'Set level'],
                      ['reset', L.reset || 'Reset'],
                    ] as const
                  ).map(([action, label]) => (
                    <button
                      key={action}
                      type="button"
                      disabled={userActionBusy === `${u.userId}:${action}`}
                      className="ui-press rounded-lg border border-border px-2 py-1 text-xs font-semibold disabled:opacity-50"
                      onClick={() => {
                        if (
                          action === 'reset' &&
                          !window.confirm(
                            L.confirmResetUser || 'Reset this member XP?',
                          )
                        ) {
                          return;
                        }
                        void mutateUser(u.userId, action);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
