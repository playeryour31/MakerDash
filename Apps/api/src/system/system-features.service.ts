import { BadRequestException, Injectable } from '@nestjs/common';
import { FeatureRepository } from '../prisma/repositories/feature.repository';
import { SystemService } from './system.service';
import { WelcomeAssetsService } from './welcome-assets.service';
import {
  defaultLevelingSettings,
  normalizeLevelingSettings,
  previewCurve,
  validateLevelingPatch,
} from './leveling.defaults';

export const SYSTEM_FEATURES = [
  'auto-responder',
  'auto-roles',
  'welcome',
  'leveling',
  'reaction-roles',
] as const;

export type SystemFeatureKey = (typeof SYSTEM_FEATURES)[number];

const NS: Record<SystemFeatureKey, string> = {
  'auto-responder': 'sys_auto_responder',
  'auto-roles': 'sys_auto_roles',
  welcome: 'sys_welcome',
  leveling: 'sys_leveling',
  'reaction-roles': 'sys_reaction_roles',
};

export type WelcomeAvatarLayout = {
  x: number;
  y: number;
  size: number;
  circle: boolean;
  border: boolean;
  borderWidth: number;
  borderColor: string;
  shadow: boolean;
  opacity: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
};

export type WelcomeTextLayout = {
  enabled: boolean;
  content: string;
  x: number;
  y: number;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
  fontFamily: string;
  shadow: boolean;
  opacity: number;
  rotation: number;
};

export type WelcomeTextLayer = {
  id: string;
  name: string;
  content: string;
  x: number;
  y: number;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
  fontFamily: string;
  opacity: number;
  rotation: number;
  shadow: boolean;
  visible: boolean;
  locked: boolean;
};

export type WelcomeBackgroundLayout = {
  fit: 'cover' | 'contain' | 'fill';
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type WelcomeOverlay = {
  color: string;
  opacity: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function newTextId() {
  return `txt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function defaultWelcome() {
  const text: WelcomeTextLayout = {
    enabled: true,
    content: 'Welcome {username}!',
    x: 50,
    y: 78,
    size: 4.5,
    color: '#ffffff',
    align: 'center',
    fontWeight: 'bold',
    fontFamily: 'Segoe UI',
    shadow: true,
    opacity: 100,
    rotation: 0,
  };
  return {
    enabled: false,
    channelId: '',
    message: 'Welcome {user} to {server}!',
    type: 'embed' as const,
    caption: true,
    embedColor: '#5865F2',
    backgroundPath: '',
    hasBackground: false,
    background: {
      fit: 'fill' as const,
      scale: 100,
      offsetX: 0,
      offsetY: 0,
    } as WelcomeBackgroundLayout,
    avatar: {
      x: 50,
      y: 38,
      size: 22,
      circle: true,
      border: false,
      borderWidth: 4,
      borderColor: '#ffffff',
      shadow: false,
      opacity: 100,
      rotation: 0,
      visible: true,
      locked: false,
    } as WelcomeAvatarLayout,
    text,
    texts: [
      {
        id: 'txt_default',
        name: 'Welcome text',
        content: text.content,
        x: text.x,
        y: text.y,
        size: text.size,
        color: text.color,
        align: text.align,
        fontWeight: text.fontWeight,
        fontFamily: text.fontFamily,
        opacity: text.opacity,
        rotation: text.rotation,
        shadow: text.shadow,
        visible: true,
        locked: false,
      } as WelcomeTextLayer,
    ],
    overlay: { color: '#000000', opacity: 0 } as WelcomeOverlay,
  };
}

function defaults(feature: SystemFeatureKey): Record<string, unknown> {
  switch (feature) {
    case 'auto-responder':
      return {
        enabled: false,
        replies: [] as Array<{
          trigger: string;
          response: string;
          match: 'exact' | 'contains';
        }>,
      };
    case 'auto-roles':
      return { enabled: false, roleIds: [] as string[] };
    case 'welcome':
      return defaultWelcome();
    case 'leveling':
      return defaultLevelingSettings() as unknown as Record<string, unknown>;
    case 'reaction-roles':
      return {
        enabled: false,
        panels: [] as Array<{
          channelId: string;
          messageId: string;
          mappings: Array<{ emoji: string; roleId: string }>;
        }>,
      };
  }
}

function isFeature(value: string): value is SystemFeatureKey {
  return (SYSTEM_FEATURES as readonly string[]).includes(value);
}

function normalizeWelcomeBackground(raw: any): WelcomeBackgroundLayout {
  const fit =
    raw?.fit === 'cover' || raw?.fit === 'contain' || raw?.fit === 'fill'
      ? raw.fit
      : 'fill';
  return {
    fit,
    scale: clamp(Number(raw?.scale ?? 100), 50, 200),
    offsetX: clamp(Number(raw?.offsetX ?? 0), -50, 50),
    offsetY: clamp(Number(raw?.offsetY ?? 0), -50, 50),
  };
}

function normalizeWelcomeOverlay(raw: any): WelcomeOverlay {
  const color = String(raw?.color || '#000000');
  return {
    color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#000000',
    opacity: clamp(Number(raw?.opacity ?? 0), 0, 80),
  };
}

function normalizeWelcomeAvatar(raw: any): WelcomeAvatarLayout {
  const borderColor = String(raw?.borderColor || '#ffffff');
  return {
    x: clamp(Number(raw?.x ?? 50), 0, 100),
    y: clamp(Number(raw?.y ?? 38), 0, 100),
    size: clamp(Number(raw?.size ?? 22), 8, 60),
    circle: raw?.circle !== false,
    border: raw?.border === true,
    borderWidth: clamp(Number(raw?.borderWidth ?? 4), 1, 20),
    borderColor: /^#[0-9a-fA-F]{6}$/.test(borderColor) ? borderColor : '#ffffff',
    shadow: raw?.shadow === true,
    opacity: clamp(Number(raw?.opacity ?? 100), 0, 100),
    rotation: clamp(Number(raw?.rotation ?? 0), -180, 180),
    visible: raw?.visible !== false,
    locked: raw?.locked === true,
  };
}

function normalizeWelcomeText(raw: any): WelcomeTextLayout {
  const align =
    raw?.align === 'left' || raw?.align === 'right' ? raw.align : 'center';
  const fontWeight =
    raw?.fontWeight === 'normal' || raw?.fontWeight === 'bold'
      ? raw.fontWeight
      : 'bold';
  return {
    enabled: raw?.enabled !== false,
    content: String(raw?.content ?? 'Welcome {username}!').slice(0, 200),
    x: clamp(Number(raw?.x ?? 50), 0, 100),
    y: clamp(Number(raw?.y ?? 78), 0, 100),
    size: clamp(Number(raw?.size ?? 4.5), 1.5, 12),
    color: /^#[0-9a-fA-F]{6}$/.test(String(raw?.color || ''))
      ? String(raw.color)
      : '#ffffff',
    align,
    fontWeight,
    fontFamily: String(raw?.fontFamily || 'Segoe UI').slice(0, 60),
    shadow: raw?.shadow !== false,
    opacity: clamp(Number(raw?.opacity ?? 100), 0, 100),
    rotation: clamp(Number(raw?.rotation ?? 0), -180, 180),
  };
}

function normalizeWelcomeTextLayer(
  raw: any,
  index: number,
): WelcomeTextLayer {
  const base = normalizeWelcomeText(raw);
  return {
    id: String(raw?.id || `txt_${index}_${newTextId()}`).slice(0, 64),
    name: String(raw?.name || `Text ${index + 1}`).slice(0, 60),
    content: base.content,
    x: base.x,
    y: base.y,
    size: base.size,
    color: base.color,
    align: base.align,
    fontWeight: base.fontWeight,
    fontFamily: base.fontFamily,
    opacity: base.opacity,
    rotation: base.rotation,
    shadow: base.shadow,
    visible: raw?.visible !== false && base.enabled !== false,
    locked: raw?.locked === true,
  };
}

function normalizeWelcomeTexts(raw: any, legacyText: any): WelcomeTextLayer[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.slice(0, 12).map((item, i) => normalizeWelcomeTextLayer(item, i));
  }
  const legacy = normalizeWelcomeText(legacyText);
  return [
    {
      id: 'txt_legacy',
      name: 'Welcome text',
      content: legacy.content,
      x: legacy.x,
      y: legacy.y,
      size: legacy.size,
      color: legacy.color,
      align: legacy.align,
      fontWeight: legacy.fontWeight,
      fontFamily: legacy.fontFamily,
      opacity: legacy.opacity,
      rotation: legacy.rotation,
      shadow: legacy.shadow,
      visible: legacy.enabled !== false,
      locked: false,
    },
  ];
}

function textLayerToLegacy(layer: WelcomeTextLayer | undefined): WelcomeTextLayout {
  if (!layer) {
    return normalizeWelcomeText({ enabled: false });
  }
  return {
    enabled: layer.visible !== false,
    content: layer.content,
    x: layer.x,
    y: layer.y,
    size: layer.size,
    color: layer.color,
    align: layer.align,
    fontWeight: layer.fontWeight,
    fontFamily: layer.fontFamily,
    shadow: layer.shadow,
    opacity: layer.opacity,
    rotation: layer.rotation,
  };
}

@Injectable()
export class SystemFeaturesService {
  constructor(
    private readonly system: SystemService,
    private readonly features: FeatureRepository,
    private readonly welcomeAssets: WelcomeAssetsService,
  ) {}

  private key(botId: string) {
    return String(botId);
  }

  async list(botId: string) {
    await this.system.ensureSystemBot(botId);
    return SYSTEM_FEATURES.map((id) => ({
      id,
      namespace: NS[id],
    }));
  }

  async getFeature(botId: string, feature: string) {
    await this.system.ensureSystemBot(botId);
    if (!isFeature(feature)) {
      throw new BadRequestException(`Unknown feature: ${feature}`);
    }
    const stored = await this.features.get(NS[feature], this.key(botId));
    const base = defaults(feature);
    let settings: Record<string, unknown> =
      stored && typeof stored === 'object' && !Array.isArray(stored)
        ? { ...base, ...(stored as Record<string, unknown>) }
        : { ...base };

    if (feature === 'welcome') {
      const abs = this.welcomeAssets.resolvePath(botId);
      const texts = normalizeWelcomeTexts(
        (settings as any).texts,
        (settings as any).text,
      );
      settings = {
        ...settings,
        avatar: normalizeWelcomeAvatar((settings as any).avatar),
        background: normalizeWelcomeBackground((settings as any).background),
        overlay: normalizeWelcomeOverlay((settings as any).overlay),
        texts,
        text: textLayerToLegacy(texts[0]),
        hasBackground: Boolean(abs),
        backgroundPath: abs
          ? this.welcomeAssets.relativePath(abs)
          : String((settings as any).backgroundPath || ''),
        backgroundUrl: abs
          ? `/system/${botId}/features/welcome/background?t=${Date.now()}`
          : null,
      };
    }

    if (feature === 'leveling') {
      const normalized = normalizeLevelingSettings(settings);
      settings = {
        ...normalized,
        curvePreview: previewCurve(normalized, 20),
        overview: {
          rewardsCount: normalized.rewards.filter((r) => r.enabled).length,
          multipliersCount: normalized.multipliers.filter((m) => m.enabled)
            .length,
          ignoredChannels: normalized.ignoredChannelIds.length,
          ignoredRoles: normalized.ignoredRoleIds.length,
          voiceXp: normalized.voiceXpEnabled,
          rankCard: normalized.rankCard.enabled,
          leaderboard: normalized.leaderboard.enabled,
        },
      };
    }

    return {
      botId,
      feature,
      settings,
    };
  }

  async updateFeature(
    botId: string,
    feature: string,
    patch: Record<string, unknown>,
  ) {
    await this.system.ensureSystemBot(botId);
    if (!isFeature(feature)) {
      throw new BadRequestException(`Unknown feature: ${feature}`);
    }
    const current = await this.getFeature(botId, feature);
    const next: Record<string, unknown> = { ...current.settings, ...patch };
    if (feature === 'leveling') {
      delete next.curvePreview;
      delete next.overview;
      delete next.xpPerMessage;
      const normalized = normalizeLevelingSettings(next);
      validateLevelingPatch(normalized);
      await this.features.set(
        NS[feature],
        this.key(botId),
        normalized as unknown as Record<string, unknown>,
        botId,
      );
      return this.getFeature(botId, feature);
    }
    if (feature === 'welcome') {
      const typeRaw = String(next.type || 'embed').toLowerCase();
      next.type =
        typeRaw === 'message' || typeRaw === 'image' ? typeRaw : 'embed';
      next.message = String(next.message || '').slice(0, 2000);
      next.caption = next.caption !== false;
      next.embedColor = /^#[0-9a-fA-F]{6}$/.test(String(next.embedColor || ''))
        ? String(next.embedColor)
        : '#5865F2';
      next.avatar = normalizeWelcomeAvatar(next.avatar);
      next.background = normalizeWelcomeBackground(next.background);
      next.overlay = normalizeWelcomeOverlay(next.overlay);
      const texts = normalizeWelcomeTexts(next.texts, next.text);
      next.texts = texts;
      next.text = textLayerToLegacy(texts[0]);
      // Never persist ephemeral preview fields / huge data URLs
      delete next.backgroundUrl;
      delete next.hasBackground;
      delete next.backgroundDataUrl;
      const abs = this.welcomeAssets.resolvePath(botId);
      if (abs) {
        next.backgroundPath = this.welcomeAssets.relativePath(abs);
      }
    }
    if (feature === 'auto-responder' && Array.isArray(next.replies)) {
      next.replies = next.replies
        .slice(0, 50)
        .map((r: any) => ({
          trigger: String(r?.trigger || '').slice(0, 200),
          response: String(r?.response || '').slice(0, 2000),
          match: r?.match === 'exact' ? 'exact' : 'contains',
        }))
        .filter((r: any) => r.trigger && r.response);
    }
    if (feature === 'auto-roles' && Array.isArray(next.roleIds)) {
      next.roleIds = next.roleIds.map(String).filter(Boolean).slice(0, 25);
    }
    if (feature === 'reaction-roles' && Array.isArray(next.panels)) {
      next.panels = next.panels.slice(0, 20);
    }

    await this.features.set(NS[feature], this.key(botId), next, botId);
    return this.getFeature(botId, feature);
  }

  async uploadWelcomeBackground(botId: string, dataUrl: string) {
    await this.system.ensureSystemBot(botId);
    const saved = this.welcomeAssets.saveFromDataUrl(botId, dataUrl);
    const current = await this.getFeature(botId, 'welcome');
    const next = {
      ...current.settings,
      backgroundPath: saved.backgroundPath,
    };
    delete (next as any).backgroundUrl;
    delete (next as any).hasBackground;
    delete (next as any).backgroundDataUrl;
    await this.features.set(NS.welcome, this.key(botId), next, botId);
    return this.getFeature(botId, 'welcome');
  }

  async deleteWelcomeBackground(botId: string) {
    await this.system.ensureSystemBot(botId);
    this.welcomeAssets.delete(botId);
    const current = await this.getFeature(botId, 'welcome');
    const next = {
      ...current.settings,
      backgroundPath: '',
    };
    delete (next as any).backgroundUrl;
    delete (next as any).hasBackground;
    delete (next as any).backgroundDataUrl;
    await this.features.set(NS.welcome, this.key(botId), next, botId);
    return this.getFeature(botId, 'welcome');
  }

  async overviewExtras(botId: string) {
    const features = await Promise.all(
      SYSTEM_FEATURES.map(async (id) => {
        const { settings } = await this.getFeature(botId, id);
        return {
          id,
          enabled: Boolean((settings as any).enabled),
        };
      }),
    );
    return { features };
  }
}
