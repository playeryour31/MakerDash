/**
 * Compose a leveling rank card with canvas (same stack as welcome cards).
 */
const { createCanvas, loadImage } = require('canvas');

function hexToRgba(hex, opacityPct) {
  const h = String(hex || '#101018').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const a = Math.min(1, Math.max(0, Number(opacityPct ?? 100) / 100));
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * @param {object} opts
 * @param {string} opts.avatarUrl
 * @param {string} opts.username
 * @param {number} opts.level
 * @param {number} opts.xp
 * @param {number} opts.progressXp
 * @param {number} opts.xpToNext
 * @param {number} opts.rank
 * @param {object} opts.rankCard settings.rankCard
 */
async function composeRankCard(opts) {
  const cfg = opts.rankCard || {};
  const width = 934;
  const height = 282;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const radius = 24;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.arcTo(width, 0, width, height, radius);
  ctx.arcTo(width, height, 0, height, radius);
  ctx.arcTo(0, height, 0, 0, radius);
  ctx.arcTo(0, 0, width, 0, radius);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = hexToRgba(
    cfg.backgroundColor || '#101018',
    cfg.backgroundOpacity ?? 100,
  );
  ctx.fillRect(0, 0, width, height);

  // Accent bar
  ctx.fillStyle = cfg.accentColor || '#5b21b6';
  ctx.fillRect(0, 0, 10, height);

  const textColor = cfg.textColor || '#f2f2f7';
  const progressColor = cfg.progressColor || '#7c3aed';

  // Avatar
  if (cfg.showAvatar !== false && opts.avatarUrl) {
    try {
      const avatar = await loadImage(opts.avatarUrl);
      const size = 160;
      const ax = 48;
      const ay = (height - size) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax + size / 2, ay + size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, ax, ay, size, size);
      ctx.restore();
      ctx.strokeStyle = cfg.accentColor || '#5b21b6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ax + size / 2, ay + size / 2, size / 2, 0, Math.PI * 2);
      ctx.stroke();
    } catch {
      /* skip avatar */
    }
  }

  const left = 240;
  if (cfg.showUsername !== false) {
    ctx.fillStyle = textColor;
    ctx.font = 'bold 42px Sans-serif';
    ctx.fillText(String(opts.username || 'Member').slice(0, 24), left, 90);
  }

  if (cfg.showRank !== false) {
    ctx.fillStyle = '#9494a8';
    ctx.font = '24px Sans-serif';
    ctx.fillText(`RANK #${opts.rank || '?'}`, left, 130);
  }

  if (cfg.showLevel !== false) {
    ctx.fillStyle = textColor;
    ctx.font = 'bold 28px Sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`LEVEL ${opts.level ?? 0}`, width - 48, 90);
    ctx.textAlign = 'left';
  }

  const barX = left;
  const barY = 180;
  const barW = width - left - 48;
  const barH = 28;
  const ratio = Math.min(
    1,
    Math.max(0, Number(opts.progressXp || 0) / Math.max(1, Number(opts.xpToNext || 1))),
  );

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, barX, barY, barW, barH, 14);
  ctx.fill();

  if (ratio > 0) {
    ctx.fillStyle = progressColor;
    roundRect(ctx, barX, barY, Math.max(barH, barW * ratio), barH, 14);
    ctx.fill();
  }

  if (cfg.showXp !== false) {
    ctx.fillStyle = '#9494a8';
    ctx.font = '20px Sans-serif';
    ctx.fillText(
      `${opts.progressXp || 0} / ${opts.xpToNext || 0} XP  ·  Total ${opts.xp || 0}`,
      left,
      240,
    );
  }

  return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

module.exports = { composeRankCard };
