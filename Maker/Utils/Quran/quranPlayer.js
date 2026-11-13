const {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  NoSubscriberBehavior,
  generateDependencyReport,
} = require('@discordjs/voice');
const fs = require('fs');
const { ChannelType, PermissionsBitField } = require('discord.js');
const quranFile = require('./quranFileStore');
const { createRadioSource, getFfmpegPath } = require('./audioSource');

// Discord now requires DAVE for voice — must load before joining
try {
  require('@snazzah/davey');
} catch (err) {
  console.warn(
    '[quran] @snazzah/davey missing — Discord voice may stay stuck in signalling:',
    err?.message || err,
  );
}

const QURAN_FILE = quranFile.QURAN_FILE;

/** @type {Map<string, { holding: boolean, guildId: string|null }>} */
const voiceHoldRegistry = new Map();

let opusKind = 'none';
try {
  require('@discordjs/opus');
  opusKind = '@discordjs/opus';
} catch {
  try {
    require('opusscript');
    opusKind = 'opusscript';
  } catch {
    /* voice will warn */
  }
}

let sodiumReady = Promise.resolve();
try {
  const sodium = require('libsodium-wrappers');
  sodiumReady = sodium.ready.then(() => {
    console.log('[quran] voice encryption ready (libsodium-wrappers)');
  });
} catch {
  console.warn(
    '[quran] libsodium-wrappers missing — Discord voice audio will be silent',
  );
}

let reportedDeps = false;
function reportVoiceDepsOnce() {
  if (reportedDeps) return;
  reportedDeps = true;
  console.log(`[quran] opus encoder: ${opusKind}`);
  try {
    console.log('[quran] voice dependency report\n' + generateDependencyReport());
  } catch (err) {
    console.warn('[quran] dependency report failed:', err?.message || err);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function key(botId) {
  return `Quran_${botId}`;
}

function actionKey(botId) {
  return `Dashboard_Quran_Action_${botId}`;
}

function clampVolume(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.8;
  return Math.max(0, Math.min(1, n > 1 ? n / 100 : n));
}

function defaultSettings() {
  return {
    voiceChannelId: '',
    radioId: '',
    radioName: '',
    radioUrl: '',
    volume: 80,
    enabled: false,
    status: 'idle',
    lastError: null,
  };
}

function readSettings(botId) {
  // Always from disk — never stale Postgres featureCache
  const raw = quranFile.get(key(botId)) || null;
  if (!raw || typeof raw !== 'object') return defaultSettings();
  return {
    ...defaultSettings(),
    ...raw,
    volume: Number.isFinite(Number(raw.volume)) ? Number(raw.volume) : 80,
  };
}

function writeSettings(botId, next) {
  quranFile.set(key(botId), next);
  return next;
}

function patchStatus(botId, patch) {
  const cur = readSettings(botId);
  return writeSettings(botId, { ...cur, ...patch });
}

function isVoiceChannel(channel) {
  if (!channel) return false;
  if (typeof channel.isVoiceBased === 'function' && channel.isVoiceBased()) {
    return true;
  }
  const t = channel.type;
  return (
    t === ChannelType.GuildVoice ||
    t === ChannelType.GuildStageVoice ||
    t === 2 ||
    t === 13 ||
    t === 'GUILD_VOICE' ||
    t === 'GUILD_STAGE_VOICE'
  );
}

function isQuranHoldingVoice(botId) {
  const row = voiceHoldRegistry.get(String(botId));
  return Boolean(row?.holding);
}

function isAbortError(err) {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  const msg = String(err.message || err);
  return msg.includes('aborted') || msg.includes('AbortError');
}

function safeRun(promise, label) {
  Promise.resolve(promise).catch((err) => {
    console.error(`[quran] unhandled ${label}:`, err?.message || err);
  });
}

/**
 * Per-client Quran voice player with locked session state machine.
 */
function createQuranPlayer(client) {
  const botId = String(client.user.id);
  const bootAt = Date.now();
  const BOOT_GRACE_MS = 15_000;

  const log = (stage, detail = '', extra = null) => {
    const suffix = detail ? ` ${detail}` : '';
    console.log(`[quran][${botId}] ${stage}${suffix}`);
    if (extra) console.log(`[quran][${botId}] detail`, extra);
  };
  const logError = (stage, err, extra = {}) => {
    console.error(`[quran][${botId}] ${stage}`, {
      message: err?.message || String(err),
      stack: err?.stack || null,
      connectionStatus: connection?.state?.status ?? null,
      playerStatus: player?.state?.status ?? null,
      wantPlaying,
      generation,
      stage: sessionStage,
      ...extra,
    });
  };

  reportVoiceDepsOnce();

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });

  let connection = null;
  let audioSource = null;
  let currentUrl = '';
  let currentChannelId = '';
  let currentGuildId = null;
  let desiredVolume = 0.8;
  let wantPlaying = false;
  let streamActive = false;
  let sessionStage = 'IDLE';
  let generation = 0;
  let busy = false;
  let pendingIntent = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let wiredPlayer = false;
  let wiredConnection = false;
  let watchdogBusy = false;
  let lastHealthyAt = 0;
  let lastWatchdogFail = 0;
  let consecutiveFails = 0;
  let syncTimer = null;
  let watcherStarted = false;
  let lastQueueHash = '';
  let lastConfigHash = '';
  let processingQueue = false;
  /** When true, Destroyed/Disconnected handlers must NOT schedule reconnect */
  let intentionalLeave = false;

  function setHold(holding) {
    voiceHoldRegistry.set(botId, {
      holding: Boolean(holding),
      guildId: holding ? currentGuildId : null,
    });
  }

  function setStage(stage, detail = '') {
    sessionStage = stage;
    log(stage, detail);
  }

  function clearReconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function destroyAudioSource() {
    if (!audioSource) return;
    try {
      audioSource.destroy();
    } catch (err) {
      logError('AUDIO_SOURCE_DESTROY', err);
    }
    audioSource = null;
    streamActive = false;
  }

  function setVolumeLevel(vol0to100) {
    desiredVolume = clampVolume(vol0to100);
    if (audioSource?.resource?.volume) {
      audioSource.resource.volume.setVolume(desiredVolume);
    }
  }

  function configSnapshot(settings = readSettings(botId)) {
    return JSON.stringify({
      voiceChannelId: settings?.voiceChannelId || '',
      radioId: settings?.radioId || '',
      radioUrl: settings?.radioUrl || '',
      volume: Number(settings?.volume ?? 80),
      enabled: Boolean(settings?.enabled),
    });
  }

  function queueSnapshot() {
    const queue = quranFile.getQueue(botId);
    return JSON.stringify(queue);
  }

  function wirePlayerOnce() {
    if (wiredPlayer) return;
    wiredPlayer = true;

    player.on(AudioPlayerStatus.Playing, () => {
      consecutiveFails = 0;
      reconnectAttempt = 0;
      lastHealthyAt = Date.now();
      setStage('PLAYING', currentUrl.slice(0, 80));
      patchStatus(botId, { status: 'playing', lastError: null });
    });

    player.on(AudioPlayerStatus.Idle, () => {
      setStage('IDLE', 'player idle');
      if (wantPlaying && currentUrl && !busy && !intentionalLeave) {
        log('IDLE', 'restarting stream');
        safeRun(
          runLocked(() => playStream(currentUrl, generation), 'idle-restart'),
          'idle-restart',
        );
      }
    });

    player.on('error', (err) => {
      logError('ERROR', err, { where: 'AudioPlayer' });
      patchStatus(botId, {
        status: 'reconnecting',
        lastError: String(err?.message || err),
      });
      if (wantPlaying && currentUrl) {
        scheduleReconnect('player-error');
      }
    });
  }

  function hardDestroyVoice(guildId) {
    intentionalLeave = true;
    const gid = String(guildId || currentGuildId || '');
    const existing = gid ? getVoiceConnection(gid) : null;
    try {
      (existing || connection)?.destroy();
    } catch (err) {
      logError('ERROR', err, { where: 'hardDestroyVoice' });
    }
    connection = null;
    wiredConnection = false;
    currentChannelId = '';
    if (!wantPlaying) setHold(false);
    // Allow next join's Destroyed handler to work normally after a tick
    setTimeout(() => {
      intentionalLeave = false;
    }, 50);
  }

  async function ensureConnection(voiceChannelId, gen) {
    setStage('CONNECTING', `channel=${voiceChannelId}`);
    patchStatus(botId, { status: 'reconnecting', lastError: null });

    const channel = await client.channels
      .fetch(String(voiceChannelId))
      .catch((err) => {
        logError('ERROR', err, { where: 'channel.fetch' });
        return null;
      });

    if (gen !== generation) {
      throw new Error(`stale generation during CONNECTING (${gen}!=${generation})`);
    }
    if (!isVoiceChannel(channel)) {
      throw new Error(
        `Invalid voice channel (${voiceChannelId}, type=${channel?.type ?? 'missing'})`,
      );
    }

    // Prefer cached guild adapter (more reliable than partial fetch guild)
    const guild =
      client.guilds.cache.get(channel.guild.id) ||
      (await client.guilds.fetch(channel.guild.id).catch(() => channel.guild));

    const me =
      guild.members.me ||
      guild.members.cache.get(client.user.id) ||
      (await guild.members.fetch(client.user.id).catch(() => null));

    if (me?.permissionsIn?.(channel)) {
      const perms = me.permissionsIn(channel);
      if (!perms.has(PermissionsBitField.Flags.Connect)) {
        throw new Error('Missing Connect permission in voice channel');
      }
      if (!perms.has(PermissionsBitField.Flags.Speak)) {
        throw new Error('Missing Speak permission in voice channel');
      }
    }

    currentGuildId = String(guild.id);
    const existing = getVoiceConnection(guild.id);
    const existingStatus = existing?.state?.status ?? null;
    const canReuse =
      existing &&
      existing.joinConfig?.channelId === channel.id &&
      existingStatus === VoiceConnectionStatus.Ready;

    if (canReuse) {
      connection = existing;
      log('CONNECTING', `reusing Ready connection`);
    } else {
      if (existing) {
        log('CONNECTING', `destroying non-Ready connection status=${existingStatus}`);
        hardDestroyVoice(guild.id);
        await sleep(1200);
        if (gen !== generation) {
          throw new Error(
            `stale generation after destroy-wait (${gen}!=${generation})`,
          );
        }
      }

      intentionalLeave = false;
      wiredConnection = false;
      connection = joinVoiceChannel({
        channelId: String(channel.id),
        guildId: String(guild.id),
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false,
      });
      if (typeof connection.setMaxListeners === 'function') {
        connection.setMaxListeners(20);
      }
      connection.on('error', (err) => {
        logError('ERROR', err, { where: 'VoiceConnection' });
      });
      connection.on('debug', (m) => {
        if (String(m).includes('state change') || String(m).includes('Networking')) {
          log('CONNECTING', `voice-debug ${String(m).slice(0, 160)}`);
        }
      });
      log('CONNECTING', `joined voice channel=${channel.id}`);
    }

    currentChannelId = String(channel.id);
    setHold(true);
    wireConnection();

    const readyTimeoutMs = 45_000;
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, readyTimeoutMs);
    } catch (err) {
      const stuckStatus = connection?.state?.status ?? 'unknown';
      logError('ERROR', err, {
        where: 'entersState.Ready',
        timeoutMs: readyTimeoutMs,
        abort: isAbortError(err),
        stuckStatus,
      });
      hardDestroyVoice(guild.id);
      setHold(false);
      throw new Error(
        `Voice Ready timeout (stuck in ${stuckStatus}). Ensure @snazzah/davey is installed and Connect/Speak perms exist.`,
      );
    }

    if (gen !== generation) {
      throw new Error(`stale generation after READY (${gen}!=${generation})`);
    }

    connection.subscribe(player);
    setStage('READY', `${channel.name || channel.id}`);
    return connection;
  }

  function wireConnection() {
    if (!connection || wiredConnection) return;
    wiredConnection = true;

    connection.on('stateChange', (_oldState, newState) => {
      if (intentionalLeave) return;
      if (!wantPlaying) return;

      if (newState.status === VoiceConnectionStatus.Disconnected) {
        patchStatus(botId, { status: 'reconnecting' });
        setStage('CONNECTING', 'disconnected — scheduling reconnect');
        destroyAudioSource();
        try {
          player.stop(true);
        } catch {
          /* ignore */
        }
        intentionalLeave = true;
        try {
          connection?.destroy();
        } catch {
          /* ignore */
        }
        connection = null;
        wiredConnection = false;
        currentChannelId = '';
        setHold(false);
        intentionalLeave = false;
        scheduleReconnect('connection-disconnected');
      } else if (newState.status === VoiceConnectionStatus.Destroyed) {
        wiredConnection = false;
        connection = null;
        currentChannelId = '';
        setHold(false);
        if (wantPlaying && !intentionalLeave) {
          scheduleReconnect('connection-destroyed');
        }
      }
    });
  }

  function destroyConnection(stopWant = true) {
    clearReconnect();
    destroyAudioSource();
    try {
      player.stop(true);
    } catch (err) {
      logError('ERROR', err, { where: 'player.stop' });
    }
    intentionalLeave = true;
    try {
      connection?.destroy();
    } catch (err) {
      logError('ERROR', err, { where: 'connection.destroy' });
    }
    connection = null;
    wiredConnection = false;
    currentChannelId = '';
    currentGuildId = null;
    setHold(false);
    if (stopWant) wantPlaying = false;
    intentionalLeave = false;
    setStage('IDLE', stopWant ? 'stopped' : 'connection cleared');
  }

  function scheduleReconnect(reason) {
    if (!wantPlaying) return;
    if (busy || sessionStage === 'CONNECTING') {
      log('CONNECTING', `skip reconnect while busy/connecting (${reason})`);
      return;
    }
    clearReconnect();
    reconnectAttempt += 1;
    const delay = Math.min(60_000, 4000 * reconnectAttempt);
    log('CONNECTING', `reconnect scheduled in ${delay}ms (${reason})`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!wantPlaying) return;
      safeRun(
        runLocked(async () => {
          const settings = readSettings(botId);
          if (!settings.voiceChannelId || !settings.radioUrl) return;
          if (
            connection &&
            connection.state.status !== VoiceConnectionStatus.Ready
          ) {
            hardDestroyVoice(currentGuildId || connection.joinConfig?.guildId);
            await sleep(1000);
          }
          await startSession(settings, { resetAttempts: false });
        }, `reconnect:${reason}`),
        `reconnect:${reason}`,
      );
    }, delay);
  }

  async function playStream(url, gen) {
    currentUrl = String(url || '').trim();
    if (!currentUrl) throw new Error('Missing radio url');
    if (gen !== generation) {
      throw new Error(`stale generation in playStream (${gen}!=${generation})`);
    }
    if (
      !connection ||
      connection.state.status !== VoiceConnectionStatus.Ready
    ) {
      throw new Error(
        `playStream refused: connection not READY (status=${connection?.state?.status ?? 'null'})`,
      );
    }

    wirePlayerOnce();
    destroyAudioSource();
    streamActive = false;

    if (!getFfmpegPath()) {
      console.warn(
        `[quran][${botId}] ffmpeg-static missing — play-dl/probe fallback`,
      );
    }

    const source = await createRadioSource({
      url: currentUrl,
      volume01: desiredVolume,
    });
    audioSource = source;
    setStage('RESOURCE_CREATED', `kind=${source.kind}`);

    source.onceData(() => {
      if (gen !== generation) return;
      streamActive = true;
      lastHealthyAt = Date.now();
      setStage('STREAM_ACTIVE', currentUrl.slice(0, 80));
    });

    player.play(source.resource);
    connection.subscribe(player);
  }

  async function startSession(settingsInput, { resetAttempts = true } = {}) {
    await sodiumReady;
    const settings = settingsInput || readSettings(botId);
    if (!settings.voiceChannelId || !settings.radioUrl) {
      throw new Error('Missing voice channel or radio url');
    }

    generation += 1;
    const gen = generation;
    wantPlaying = true;
    if (resetAttempts) reconnectAttempt = 0;
    setVolumeLevel(settings.volume);
    writeSettings(botId, {
      ...settings,
      enabled: true,
      status: 'reconnecting',
      lastError: null,
    });

    await ensureConnection(settings.voiceChannelId, gen);
    await playStream(settings.radioUrl, gen);
    consecutiveFails = 0;
    lastHealthyAt = Date.now();
    return readSettings(botId);
  }

  async function stopSession() {
    generation += 1;
    wantPlaying = false;
    reconnectAttempt = 0;
    destroyConnection(true);
    patchStatus(botId, { enabled: false, status: 'idle', lastError: null });
    log('IDLE', 'stop requested');
    return readSettings(botId);
  }

  async function applySettingsSession(partial, { autoStart = true } = {}) {
    const cur = readSettings(botId);
    const next = { ...cur, ...partial };
    writeSettings(botId, next);
    setVolumeLevel(next.volume);

    if (partial.volume != null && audioSource?.resource?.volume) {
      audioSource.resource.volume.setVolume(desiredVolume);
    }

    if (!autoStart) return readSettings(botId);

    const channelChanged =
      partial.voiceChannelId != null &&
      String(partial.voiceChannelId) !== String(cur.voiceChannelId);
    const radioChanged =
      partial.radioUrl != null &&
      String(partial.radioUrl) !== String(cur.radioUrl);

    const shouldBeLive = wantPlaying || next.enabled;
    if (!shouldBeLive) return readSettings(botId);

    if (channelChanged || radioChanged || !connection) {
      await startSession(next);
    } else if (partial.radioUrl) {
      await playStream(partial.radioUrl, generation);
    }
    return readSettings(botId);
  }

  async function runLocked(fn, reason) {
    if (busy) {
      pendingIntent = { fn, reason };
      log('CONNECTING', `queued intent while busy (${reason})`);
      return null;
    }
    busy = true;
    try {
      return await fn();
    } finally {
      busy = false;
      if (pendingIntent) {
        const next = pendingIntent;
        pendingIntent = null;
        safeRun(runLocked(next.fn, next.reason), next.reason);
      }
    }
  }

  async function processQueue() {
    if (processingQueue) return;
    processingQueue = true;
    try {
      const queue = quranFile.getQueue(botId);
      if (!Array.isArray(queue) || queue.length === 0) return;
      // Claim the queue immediately so Nest can enqueue new intents
      quranFile.setQueue(botId, []);
      log('CONNECTING', `processing ${queue.length} dashboard action(s)`);

      const partial = {};
      let finalAction = null;
      let hasApply = false;
      let volumeOnly = null;
      let forcePlay = false;

      for (const item of queue) {
        const action = String(item?.action || '');
        if (action === 'play' || action === 'live') {
          finalAction = 'play';
          forcePlay = true;
          if (item.voiceChannelId != null) {
            partial.voiceChannelId = item.voiceChannelId;
            hasApply = true;
          }
          if (item.radioId != null) {
            partial.radioId = item.radioId;
            hasApply = true;
          }
          if (item.radioName != null) {
            partial.radioName = item.radioName;
            hasApply = true;
          }
          if (item.radioUrl != null) {
            partial.radioUrl = item.radioUrl;
            hasApply = true;
          }
          if (item.volume != null) {
            partial.volume = item.volume;
            hasApply = true;
          }
          if (item.enabled != null) {
            partial.enabled = item.enabled;
            hasApply = true;
          }
        } else if (action === 'stop') {
          finalAction = 'stop';
          forcePlay = false;
        } else if (action === 'applySettings' || action === 'setSettings') {
          hasApply = true;
          if (item.play) forcePlay = true;
          if (item.voiceChannelId != null) {
            partial.voiceChannelId = item.voiceChannelId;
          }
          if (item.radioId != null) partial.radioId = item.radioId;
          if (item.radioName != null) partial.radioName = item.radioName;
          if (item.radioUrl != null) partial.radioUrl = item.radioUrl;
          if (item.volume != null) partial.volume = item.volume;
          if (item.enabled != null) partial.enabled = item.enabled;
        } else if (action === 'setVolume') {
          if (item.volume != null) volumeOnly = item.volume;
        } else if (action === 'setRadio') {
          hasApply = true;
          if (item.radioId != null) partial.radioId = item.radioId;
          if (item.radioName != null) partial.radioName = item.radioName;
          if (item.radioUrl != null) partial.radioUrl = item.radioUrl;
        } else if (action === 'setChannel') {
          hasApply = true;
          if (item.voiceChannelId != null) {
            partial.voiceChannelId = item.voiceChannelId;
          }
        }
      }

      await runLocked(async () => {
        try {
          // Last stop/play in the batch wins (avoid stop+play → stuck stopped)
          if (finalAction === 'stop' && !forcePlay) {
            if (hasApply) {
              await applySettingsSession(partial, { autoStart: false });
            }
            await stopSession();
            return;
          }

          // Volume-only: never tear down the voice connection
          if (volumeOnly != null && !hasApply && finalAction == null) {
            setVolumeLevel(volumeOnly);
            const cur = readSettings(botId);
            writeSettings(botId, { ...cur, volume: Number(volumeOnly) });
            log('PLAYING', `volume live=${volumeOnly}`);
            return;
          }

          if (hasApply) {
            const shouldStart =
              forcePlay ||
              finalAction === 'play' ||
              Boolean(partial.enabled) ||
              wantPlaying ||
              readSettings(botId).enabled;
            await applySettingsSession(partial, { autoStart: false });
            if (shouldStart || finalAction === 'play' || forcePlay) {
              await startSession(readSettings(botId));
            } else if (partial.volume != null) {
              setVolumeLevel(partial.volume);
            }
            return;
          }

          if (finalAction === 'play' || forcePlay) {
            await startSession();
          } else if (volumeOnly != null) {
            setVolumeLevel(volumeOnly);
            const cur = readSettings(botId);
            writeSettings(botId, { ...cur, volume: Number(volumeOnly) });
          }
        } catch (err) {
          logError('ERROR', err, { where: 'processQueue' });
          consecutiveFails += 1;
          lastWatchdogFail = Date.now();
          patchStatus(botId, {
            status: 'error',
            lastError: String(err?.message || err),
          });
          if (wantPlaying) scheduleReconnect('processQueue-failed');
        }
      }, 'processQueue');
    } finally {
      processingQueue = false;
    }
  }

  async function syncFromDisk(reason = 'unknown') {
    const queueHash = queueSnapshot();
    const settings = readSettings(botId);
    const settingsHash = configSnapshot(settings);

    if (queueHash !== lastQueueHash) {
      lastQueueHash = queueHash;
      await processQueue();
      lastQueueHash = queueSnapshot();
      lastConfigHash = configSnapshot();
      return;
    }

    if (settingsHash !== lastConfigHash) {
      lastConfigHash = settingsHash;
      await runLocked(async () => {
        if (!settings.enabled) {
          await stopSession();
          return;
        }
        if (settings.voiceChannelId && settings.radioUrl) {
          await startSession(settings);
          log('READY', `synced from dashboard (${reason})`);
        }
      }, `sync:${reason}`);
    }
  }

  function scheduleSync(reason = 'file-change') {
    if (syncTimer) clearTimeout(syncTimer);
    // Near-instant: dashboard control should hit the bot within ~50ms of file write
    syncTimer = setTimeout(() => {
      safeRun(syncFromDisk(reason), 'syncFromDisk');
    }, 40);
  }

  function watchDashboardChanges() {
    if (watcherStarted) return;
    watcherStarted = true;
    lastQueueHash = queueSnapshot();
    lastConfigHash = configSnapshot();
    try {
      fs.watchFile(QURAN_FILE, { interval: 120 }, () => {
        scheduleSync('watch-file');
      });
    } catch (err) {
      logError('ERROR', err, { where: 'watchFile' });
    }
    try {
      fs.watch(QURAN_FILE, { persistent: true }, () => {
        scheduleSync('fs-watch');
      });
    } catch {
      /* watchFile fallback is enough */
    }
    // Hard poll so control stays snappy even if FS events are missed on Windows
    setInterval(() => {
      safeRun(processQueue(), 'queue-poll');
    }, 400);
  }

  async function watchdog() {
    if (watchdogBusy || busy) return;
    if (!client.isReady?.()) return;
    if (Date.now() - bootAt < BOOT_GRACE_MS) return;
    if (sessionStage === 'CONNECTING' || sessionStage === 'RESOURCE_CREATED') {
      return;
    }

    const failCooldown = Math.min(
      120_000,
      15_000 * Math.max(1, consecutiveFails),
    );
    if (Date.now() - lastWatchdogFail < failCooldown) return;
    if (consecutiveFails >= 6) {
      if (Date.now() - lastWatchdogFail > 180_000) consecutiveFails = 0;
      else return;
    }

    watchdogBusy = true;
    try {
      await sodiumReady;
      await processQueue();

      const settings = readSettings(botId);
      if (!settings.enabled || !settings.voiceChannelId || !settings.radioUrl) {
        consecutiveFails = 0;
        return;
      }

      const connStatus = connection?.state?.status ?? null;
      const connOk =
        connection &&
        currentChannelId === String(settings.voiceChannelId) &&
        connStatus === VoiceConnectionStatus.Ready;
      const playerOk =
        player.state.status === AudioPlayerStatus.Playing ||
        player.state.status === AudioPlayerStatus.Buffering;
      const healthy =
        wantPlaying &&
        connOk &&
        playerOk &&
        (streamActive || Date.now() - lastHealthyAt < 20_000);

      if (
        connection &&
        (connStatus === VoiceConnectionStatus.Signalling ||
          connStatus === VoiceConnectionStatus.Connecting) &&
        Date.now() - lastHealthyAt > 25_000
      ) {
        log('CONNECTING', `watchdog clearing stuck ${connStatus}`);
        hardDestroyVoice(currentGuildId);
      }

      if (!healthy) {
        // First boot: enabled=true should start once, not storm
        wantPlaying = true;
        log(
          'CONNECTING',
          `watchdog restart want=${wantPlaying} conn=${connStatus ?? 'null'} player=${player.state.status} streamActive=${streamActive}`,
        );
        await runLocked(
          () => startSession(settings, { resetAttempts: false }),
          'watchdog-restart',
        );
        consecutiveFails = 0;
        lastHealthyAt = Date.now();
      }
    } catch (err) {
      consecutiveFails += 1;
      lastWatchdogFail = Date.now();
      logError('ERROR', err, { where: 'watchdog' });
      patchStatus(botId, {
        status: 'error',
        lastError: String(err?.message || err),
      });
    } finally {
      watchdogBusy = false;
    }
  }

  wirePlayerOnce();
  watchDashboardChanges();

  try {
    const queue = quranFile.getQueue(botId);
    if (Array.isArray(queue) && queue.length > 0) {
      log('IDLE', `clearing stale action queue (${queue.length})`);
      quranFile.setQueue(botId, []);
    }
  } catch (err) {
    logError('ERROR', err, { where: 'stale-queue-clear' });
  }

  return {
    start: (settings) =>
      runLocked(() => startSession(settings), 'start').catch((err) => {
        logError('ERROR', err, { where: 'start' });
        throw err;
      }),
    stop: () =>
      runLocked(() => stopSession(), 'stop').catch((err) => {
        logError('ERROR', err, { where: 'stop' });
        throw err;
      }),
    applySettings: (partial) =>
      runLocked(() => applySettingsSession(partial), 'applySettings').catch(
        (err) => {
          logError('ERROR', err, { where: 'applySettings' });
          throw err;
        },
      ),
    processQueue,
    watchdog,
    readSettings: () => readSettings(botId),
    isHoldingVoice: () => isQuranHoldingVoice(botId),
  };
}

module.exports = {
  createQuranPlayer,
  readSettings,
  writeSettings,
  key,
  isQuranHoldingVoice,
};
