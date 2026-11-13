const { spawn } = require('child_process');
const { createAudioResource, StreamType } = require('@discordjs/voice');

let ffmpegPath = null;
try {
  ffmpegPath = require('ffmpeg-static');
  if (ffmpegPath) process.env.FFMPEG_PATH = ffmpegPath;
} catch {
  /* optional */
}

let playDl = null;
try {
  playDl = require('play-dl');
} catch {
  /* optional — used for non-ICY http / youtube-like urls */
}

/**
 * Audio source for Quran radio.
 * Prefers ffmpeg (ICY/radio), falls back to play-dl, then URL probe.
 *
 * @returns {Promise<{
 *   resource: import('@discordjs/voice').AudioResource,
 *   destroy: () => void,
 *   onceData: (cb: () => void) => void,
 *   kind: string,
 * }>}
 */
async function createRadioSource({ url, volume01 }) {
  const inputUrl = String(url || '').trim();
  if (!inputUrl) {
    throw new Error('createRadioSource: url required');
  }

  if (ffmpegPath) {
    return createFfmpegSource(inputUrl, volume01);
  }

  if (playDl) {
    try {
      return await createPlayDlSource(inputUrl, volume01);
    } catch (err) {
      console.warn(
        '[quran][audioSource] play-dl failed, using url probe:',
        err?.message || err,
      );
    }
  }

  return createProbeSource(inputUrl, volume01);
}

function attachOnceData(readable) {
  let dataCb = null;
  let dataFired = false;
  const onData = () => {
    if (dataFired) return;
    dataFired = true;
    if (typeof dataCb === 'function') dataCb();
  };
  if (readable && typeof readable.once === 'function') {
    readable.once('data', onData);
  } else {
    setImmediate(onData);
  }
  return {
    onceData(cb) {
      dataCb = cb;
      if (dataFired && typeof cb === 'function') cb();
    },
    markFired: onData,
  };
}

function createFfmpegSource(inputUrl, volume01) {
  const args = [
    '-nostdin',
    '-hide_banner',
    '-loglevel',
    'error',
    '-reconnect',
    '1',
    '-reconnect_streamed',
    '1',
    '-reconnect_delay_max',
    '5',
    '-rw_timeout',
    '15000000',
    '-user_agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    '-headers',
    'Icy-MetaData: 1\r\n',
    '-i',
    inputUrl,
    '-vn',
    '-analyzeduration',
    '0',
    '-f',
    's16le',
    '-ar',
    '48000',
    '-ac',
    '2',
    'pipe:1',
  ];

  const ffmpeg = spawn(ffmpegPath, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let destroyed = false;
  const dataHook = attachOnceData(ffmpeg.stdout);

  ffmpeg.stderr?.on('data', (buf) => {
    const line = String(buf || '').trim();
    if (line) console.warn('[quran][audioSource] ffmpeg:', line.slice(0, 240));
  });

  ffmpeg.on('error', (err) => {
    console.error(
      '[quran][audioSource] ffmpeg spawn error:',
      err?.message || err,
    );
  });

  ffmpeg.on('close', (code, signal) => {
    if (destroyed) return;
    if (code && code !== 0) {
      console.warn(
        `[quran][audioSource] ffmpeg exited code=${code} signal=${signal || 'none'}`,
      );
    }
  });

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Raw,
    inlineVolume: true,
  });
  if (resource.volume) resource.volume.setVolume(volume01);

  return {
    kind: 'ffmpeg-icy',
    resource,
    onceData: dataHook.onceData,
    destroy() {
      destroyed = true;
      try {
        ffmpeg.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    },
  };
}

async function createPlayDlSource(inputUrl, volume01) {
  const streamInfo = await playDl.stream(inputUrl, {
    discordPlayerCompatibility: true,
  });
  const resource = createAudioResource(streamInfo.stream, {
    inputType: streamInfo.type,
    inlineVolume: true,
  });
  if (resource.volume) resource.volume.setVolume(volume01);
  const dataHook = attachOnceData(streamInfo.stream);

  return {
    kind: 'play-dl',
    resource,
    onceData: dataHook.onceData,
    destroy() {
      try {
        streamInfo.stream?.destroy?.();
      } catch {
        /* ignore */
      }
    },
  };
}

function createProbeSource(inputUrl, volume01) {
  const resource = createAudioResource(inputUrl, { inlineVolume: true });
  if (resource.volume) resource.volume.setVolume(volume01);
  let dataCb = null;
  let fired = false;
  return {
    kind: 'url-probe',
    resource,
    onceData(cb) {
      dataCb = cb;
      setImmediate(() => {
        if (!fired && dataCb) {
          fired = true;
          dataCb();
        }
      });
    },
    destroy() {
      dataCb = null;
    },
  };
}

function getFfmpegPath() {
  return ffmpegPath;
}

module.exports = {
  createRadioSource,
  getFfmpegPath,
};
