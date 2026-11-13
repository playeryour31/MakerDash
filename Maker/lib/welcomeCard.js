/**
 * Compose a System-bot welcome card: background + member avatar + text layers.
 */
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const ROOT = path.resolve(__dirname, '..', '..');

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function resolveBackground(settings) {
  const rel = String(settings?.backgroundPath || '').trim();
  if (rel) {
    const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
    if (fs.existsSync(abs)) return abs;
  }
  const botId = String(settings?.botId || settings?._botId || '');
  if (botId) {
    const dir = path.join(ROOT, 'Database', 'Uploads', 'welcome');
    for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
      const p = path.join(dir, `${botId}.${ext}`);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function fillTemplate(template, ctx) {
  return String(template || '')
    .replace(/\{user\}/gi, ctx.mention || ctx.username || '')
    .replace(/\{mention\}/gi, ctx.mention || ctx.username || '')
    .replace(/\{username\}/gi, ctx.username || '')
    .replace(/\{displayname\}/gi, ctx.displayName || ctx.username || '')
    .replace(/\{userid\}/gi, ctx.userId || '')
    .replace(/\{useravatar\}/gi, ctx.userAvatar || '')
    .replace(/\{server\}/gi, ctx.server || '')
    .replace(/\{serverid\}/gi, ctx.serverId || '')
    .replace(/\{servericon\}/gi, ctx.serverIcon || '')
    .replace(/\{serverowner\}/gi, ctx.serverOwner || '')
    .replace(/\{membercount\}/gi, String(ctx.memberCount ?? ''))
    .replace(/\{joinedat\}/gi, ctx.joinedAt || '')
    .replace(/\{accountcreated\}/gi, ctx.accountCreated || '')
    .replace(/\{tag\}/gi, ctx.tag || '');
}

function resolveTextLayers(settings) {
  if (Array.isArray(settings?.texts) && settings.texts.length > 0) {
    return settings.texts.filter((t) => t && t.visible !== false);
  }
  const textCfg = settings?.text || {};
  if (textCfg.enabled === false) return [];
  return [
    {
      content:
        textCfg.content != null && String(textCfg.content).trim()
          ? textCfg.content
          : settings?.message || 'Welcome {username}!',
      x: textCfg.x,
      y: textCfg.y,
      size: textCfg.size,
      color: textCfg.color,
      align: textCfg.align,
      fontWeight: textCfg.fontWeight,
      fontFamily: textCfg.fontFamily,
      opacity: textCfg.opacity,
      rotation: textCfg.rotation,
      shadow: textCfg.shadow,
      visible: true,
    },
  ];
}

function drawBackground(ctx, background, width, height, bgCfg) {
  const fit = bgCfg?.fit === 'cover' || bgCfg?.fit === 'contain' ? bgCfg.fit : 'fill';
  const scalePct = clamp(Number(bgCfg?.scale ?? 100), 50, 200) / 100;
  const offsetX = (clamp(Number(bgCfg?.offsetX ?? 0), -50, 50) / 100) * width;
  const offsetY = (clamp(Number(bgCfg?.offsetY ?? 0), -50, 50) / 100) * height;
  const iw = background.width || width;
  const ih = background.height || height;

  if (fit === 'fill') {
    const dw = width * scalePct;
    const dh = height * scalePct;
    ctx.drawImage(background, (width - dw) / 2 + offsetX, (height - dh) / 2 + offsetY, dw, dh);
    return;
  }

  const scale =
    fit === 'cover'
      ? Math.max(width / iw, height / ih) * scalePct
      : Math.min(width / iw, height / ih) * scalePct;
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(background, (width - dw) / 2 + offsetX, (height - dh) / 2 + offsetY, dw, dh);
}

function drawTextLayer(ctx, layer, vars, width, height) {
  const raw =
    layer.content != null && String(layer.content).trim()
      ? layer.content
      : 'Welcome {username}!';
  const line = fillTemplate(raw, vars || {});
  const sizePctText = clamp(Number(layer.size ?? 4.5), 1.5, 12);
  const fontPx = Math.round((height * sizePctText) / 100);
  const tx = (width * clamp(Number(layer.x ?? 50), 0, 100)) / 100;
  const ty = (height * clamp(Number(layer.y ?? 78), 0, 100)) / 100;
  const align = ['left', 'center', 'right'].includes(layer.align)
    ? layer.align
    : 'center';
  const color = String(layer.color || '#ffffff');
  const weight =
    layer.fontWeight === 'normal' || layer.fontWeight === 'bold'
      ? layer.fontWeight
      : 'bold';
  const family = String(layer.fontFamily || 'Segoe UI').replace(/["']/g, '');
  const opacity = clamp(Number(layer.opacity ?? 100), 0, 100) / 100;
  const rotation = (clamp(Number(layer.rotation ?? 0), -180, 180) * Math.PI) / 180;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(tx, ty);
  if (rotation) ctx.rotate(rotation);
  ctx.font = `${weight} ${fontPx}px "${family}", Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (layer.shadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillText(line, 2, 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(line, 0, 0);
  ctx.restore();
}

/**
 * @param {object} opts
 * @param {string} opts.avatarUrl
 * @param {object} opts.settings  sys_welcome settings
 * @param {object} opts.vars
 * @returns {Promise<Buffer|null>}
 */
async function composeWelcomeCard({ avatarUrl, settings, vars }) {
  const bgPath = resolveBackground({ ...settings, botId: settings?.botId });
  if (!bgPath) return null;

  const background = await loadImage(bgPath);
  const width = background.width || 1024;
  const height = background.height || 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx, background, width, height, settings?.background || {});

  const overlay = settings?.overlay || {};
  const overlayOpacity = clamp(Number(overlay.opacity ?? 0), 0, 80) / 100;
  if (overlayOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = overlayOpacity;
    ctx.fillStyle = String(overlay.color || '#000000');
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  const avatarCfg = settings?.avatar || {};
  if (avatarCfg.visible !== false && avatarUrl) {
    try {
      const sizePct = clamp(Number(avatarCfg.size ?? 22), 8, 60);
      const size = Math.round((Math.min(width, height) * sizePct) / 100);
      const cx = (width * clamp(Number(avatarCfg.x ?? 50), 0, 100)) / 100;
      const cy = (height * clamp(Number(avatarCfg.y ?? 38), 0, 100)) / 100;
      const x = cx - size / 2;
      const y = cy - size / 2;
      const circle = avatarCfg.circle !== false;
      const opacity = clamp(Number(avatarCfg.opacity ?? 100), 0, 100) / 100;
      const rotation =
        (clamp(Number(avatarCfg.rotation ?? 0), -180, 180) * Math.PI) / 180;
      const showBorder = avatarCfg.border === true;
      const borderWidth = clamp(Number(avatarCfg.borderWidth ?? 4), 1, 20);
      const borderColor = String(avatarCfg.borderColor || '#ffffff');
      const showShadow = avatarCfg.shadow === true;

      const avatar = await loadImage(avatarUrl);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(cx, cy);
      if (rotation) ctx.rotate(rotation);

      if (showShadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = Math.max(8, size * 0.08);
        ctx.shadowOffsetY = Math.max(2, size * 0.02);
      }

      ctx.beginPath();
      if (circle) {
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      } else {
        ctx.rect(-size / 2, -size / 2, size, size);
      }
      ctx.closePath();
      ctx.clip();
      ctx.shadowColor = 'transparent';
      ctx.drawImage(avatar, -size / 2, -size / 2, size, size);
      ctx.restore();

      if (showBorder) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(cx, cy);
        if (rotation) ctx.rotate(rotation);
        ctx.beginPath();
        if (circle) {
          ctx.arc(0, 0, size / 2 + borderWidth / 2, 0, Math.PI * 2);
        } else {
          const half = size / 2 + borderWidth / 2;
          ctx.rect(-half, -half, half * 2, half * 2);
        }
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();
        ctx.restore();
      } else if (circle && !showBorder) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2 + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.restore();
      }
    } catch (err) {
      console.warn(`[welcome-card] avatar load failed: ${err.message}`);
    }
  }

  const layers = resolveTextLayers(settings);
  for (const layer of layers) {
    drawTextLayer(ctx, layer, vars, width, height);
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  composeWelcomeCard,
  fillTemplate,
  resolveBackground,
};
