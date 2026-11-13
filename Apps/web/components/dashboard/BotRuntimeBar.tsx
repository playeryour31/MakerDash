'use client';

import { Power, RefreshCw } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { mutate as globalMutate } from 'swr';
import type { OwnedBot } from '@/hooks/useAuthData';

export type RuntimeBusy = null | 'start' | 'stop' | 'restart';

export function botRuntimeKey(botId: string) {
  return ['bot-runtime', String(botId)] as const;
}

type Props = {
  running: boolean;
  busy?: RuntimeBusy;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  className?: string;
};

/** Unified Bot runtime control — same look on every settings page. */
export function BotRuntimeBar({
  running,
  busy = null,
  onStart,
  onStop,
  onRestart,
  className = '',
}: Props) {
  const { t } = useI18n();
  const isBusy = Boolean(busy);

  return (
    <div className={`settings-runtime-card ${className}`.trim()}>
      <div className="settings-runtime-meta">
        <p className="settings-runtime-label">{t.settings.sectionRuntime}</p>
        <p
          className={`settings-runtime-state ${
            running ? 'is-online' : 'is-offline'
          }`}
        >
          <span className="settings-runtime-dot" aria-hidden />
          {running ? t.common.online : t.common.offline}
        </p>
      </div>

      <div className="settings-runtime-actions">
        {running ? (
          <>
            <button
              type="button"
              disabled={isBusy}
              onClick={onRestart}
              className="ui-press settings-runtime-btn is-restart"
            >
              <RefreshCw
                size={15}
                className={busy === 'restart' ? 'animate-spin' : ''}
              />
              {busy === 'restart'
                ? t.settings.restartingBot
                : t.settings.restartBot}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={onStop}
              className="ui-press settings-runtime-btn is-stop"
            >
              <Power size={15} />
              {busy === 'stop' ? t.common.loading : t.settings.stopBot}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isBusy}
            onClick={onStart}
            className="ui-press settings-runtime-btn is-start"
          >
            <Power size={15} />
            {busy === 'start' ? t.common.loading : t.settings.startBot}
          </button>
        )}
      </div>
    </div>
  );
}

/** Keep home cards + sidebar pill in sync after runtime changes. */
export async function syncHomeBotRunning(botId: string, running: boolean) {
  const id = String(botId);
  await Promise.all([
    globalMutate(botRuntimeKey(id), running, { revalidate: false }),
    globalMutate(
      ['bots-mine'],
      (prev: OwnedBot[] | undefined) =>
        (prev || []).map((b) =>
          String(b.clientId) === id ? { ...b, running } : b,
        ),
      // Revalidate after local patch so cards stay correct if cache was empty
      { revalidate: true },
    ),
  ]);
}
