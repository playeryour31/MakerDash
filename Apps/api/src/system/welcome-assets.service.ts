import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const MAX_BYTES = 12 * 1024 * 1024;
const DATA_URL_RE = /^data:image\/(png|jpe?g|webp);base64,/i;

@Injectable()
export class WelcomeAssetsService {
  private rootDir() {
    const root = process.env.MAKER_ROOT || process.cwd();
    return path.resolve(root, 'Database', 'Uploads', 'welcome');
  }

  private ensureDir() {
    const dir = this.rootDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  resolvePath(botId: string, preferredExt?: string): string | null {
    const dir = this.rootDir();
    const id = String(botId);
    const exts = preferredExt
      ? [preferredExt.replace(/^\./, ''), 'png', 'jpg', 'jpeg', 'webp']
      : ['png', 'jpg', 'jpeg', 'webp'];
    for (const ext of exts) {
      const p = path.join(dir, `${id}.${ext}`);
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  relativePath(absPath: string): string {
    const root = process.env.MAKER_ROOT || process.cwd();
    return path.relative(root, absPath).replace(/\\/g, '/');
  }

  saveFromDataUrl(botId: string, dataUrl: string) {
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new BadRequestException('backgroundDataUrl is required');
    }
    const match = DATA_URL_RE.exec(dataUrl);
    if (!match) {
      throw new BadRequestException(
        'background must be a PNG/JPEG/WebP data URL',
      );
    }
    const mime = match[1].toLowerCase();
    const ext = mime === 'jpeg' || mime === 'jpg' ? 'jpg' : mime === 'webp' ? 'webp' : 'png';
    const b64 = dataUrl.slice(match[0].length);
    let buf: Buffer;
    try {
      buf = Buffer.from(b64, 'base64');
    } catch {
      throw new BadRequestException('Invalid base64 image');
    }
    if (!buf.length || buf.length > MAX_BYTES) {
      throw new BadRequestException('Image must be between 1 byte and 12MB');
    }

    const dir = this.ensureDir();
    // Remove old variants
    for (const old of ['png', 'jpg', 'jpeg', 'webp']) {
      const p = path.join(dir, `${botId}.${old}`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    const abs = path.join(dir, `${String(botId)}.${ext}`);
    fs.writeFileSync(abs, buf);
    return {
      backgroundPath: this.relativePath(abs),
      backgroundExt: ext,
      bytes: buf.length,
    };
  }

  readFile(botId: string): { buffer: Buffer; contentType: string } {
    const abs = this.resolvePath(botId);
    if (!abs) throw new NotFoundException('No welcome background uploaded');
    const ext = path.extname(abs).toLowerCase();
    const contentType =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/png';
    return { buffer: fs.readFileSync(abs), contentType };
  }

  delete(botId: string) {
    const dir = this.rootDir();
    let removed = false;
    for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
      const p = path.join(dir, `${String(botId)}.${ext}`);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        removed = true;
      }
    }
    return { removed };
  }
}
