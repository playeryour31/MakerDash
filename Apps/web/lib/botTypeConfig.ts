import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Boxes,
  ClipboardCheck,
  Gift,
  MessageSquareQuote,
  Package,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Volume2,
  Wallet,
  Tags,
  LineChart,
  Megaphone,
} from 'lucide-react';

/**
 * Canonical bot product types used across Maker.
 * Matches Prisma `BotType` plus UI aliases (e.g. Logs → Log).
 */
export type BotTypeKey =
  | 'system'
  | 'giveaway'
  | 'logs'
  | 'ticket'
  | 'applications'
  | 'protection'
  | 'stock'
  | 'muslim'
  | 'azkar'
  | 'autoline'
  | 'feedback'
  | 'offer'
  | 'package'
  | 'selfrole'
  | 'suggestion'
  | 'tax'
  | 'temprole'
  | 'tempvoice'
  | 'unknown';

export type BotTypeAccent =
  | 'violet'
  | 'rose'
  | 'sky'
  | 'amber'
  | 'emerald'
  | 'cyan'
  | 'orange'
  | 'indigo'
  | 'slate';

export const BOT_TYPE_ACCENTS: Record<
  BotTypeAccent,
  { accent: string; soft: string; border: string }
> = {
  violet: {
    accent: '#8b5cf6',
    soft: 'rgba(139, 92, 246, 0.16)',
    border: 'rgba(139, 92, 246, 0.4)',
  },
  rose: {
    accent: '#f472b6',
    soft: 'rgba(244, 114, 182, 0.14)',
    border: 'rgba(244, 114, 182, 0.38)',
  },
  sky: {
    accent: '#38bdf8',
    soft: 'rgba(56, 189, 248, 0.14)',
    border: 'rgba(56, 189, 248, 0.38)',
  },
  amber: {
    accent: '#fbbf24',
    soft: 'rgba(251, 191, 36, 0.14)',
    border: 'rgba(251, 191, 36, 0.38)',
  },
  emerald: {
    accent: '#34d399',
    soft: 'rgba(52, 211, 153, 0.14)',
    border: 'rgba(52, 211, 153, 0.38)',
  },
  cyan: {
    accent: '#22d3ee',
    soft: 'rgba(34, 211, 238, 0.14)',
    border: 'rgba(34, 211, 238, 0.38)',
  },
  orange: {
    accent: '#fb923c',
    soft: 'rgba(251, 146, 60, 0.14)',
    border: 'rgba(251, 146, 60, 0.38)',
  },
  indigo: {
    accent: '#818cf8',
    soft: 'rgba(129, 140, 248, 0.14)',
    border: 'rgba(129, 140, 248, 0.38)',
  },
  slate: {
    accent: '#94a3b8',
    soft: 'rgba(148, 163, 184, 0.14)',
    border: 'rgba(148, 163, 184, 0.36)',
  },
};

export type BotTypeConfig = {
  key: BotTypeKey;
  /** CSS data-attribute value for accent styling */
  accent: BotTypeAccent;
  icon: LucideIcon;
  /** i18n key under t.botTypes.* */
  labelKey: BotTypeKey;
};

const BY_CANONICAL: Record<BotTypeKey, BotTypeConfig> = {
  system: {
    key: 'system',
    accent: 'slate',
    icon: Settings2,
    labelKey: 'system',
  },
  giveaway: {
    key: 'giveaway',
    accent: 'rose',
    icon: Gift,
    labelKey: 'giveaway',
  },
  logs: {
    key: 'logs',
    accent: 'sky',
    icon: ScrollText,
    labelKey: 'logs',
  },
  ticket: {
    key: 'ticket',
    accent: 'amber',
    icon: Ticket,
    labelKey: 'ticket',
  },
  applications: {
    key: 'applications',
    accent: 'violet',
    icon: ClipboardCheck,
    labelKey: 'applications',
  },
  protection: {
    key: 'protection',
    accent: 'emerald',
    icon: ShieldCheck,
    labelKey: 'protection',
  },
  stock: {
    key: 'stock',
    accent: 'orange',
    icon: Package,
    labelKey: 'stock',
  },
  muslim: {
    key: 'muslim',
    accent: 'cyan',
    icon: Sparkles,
    labelKey: 'muslim',
  },
  /** @deprecated alias — product renamed to muslim */
  azkar: {
    key: 'muslim',
    accent: 'cyan',
    icon: Sparkles,
    labelKey: 'muslim',
  },
  autoline: {
    key: 'autoline',
    accent: 'indigo',
    icon: Megaphone,
    labelKey: 'autoline',
  },
  feedback: {
    key: 'feedback',
    accent: 'sky',
    icon: MessageSquareQuote,
    labelKey: 'feedback',
  },
  offer: {
    key: 'offer',
    accent: 'rose',
    icon: Tags,
    labelKey: 'offer',
  },
  package: {
    key: 'package',
    accent: 'orange',
    icon: Boxes,
    labelKey: 'package',
  },
  selfrole: {
    key: 'selfrole',
    accent: 'indigo',
    icon: Tags,
    labelKey: 'selfrole',
  },
  suggestion: {
    key: 'suggestion',
    accent: 'cyan',
    icon: LineChart,
    labelKey: 'suggestion',
  },
  tax: {
    key: 'tax',
    accent: 'amber',
    icon: Wallet,
    labelKey: 'tax',
  },
  temprole: {
    key: 'temprole',
    accent: 'violet',
    icon: Tags,
    labelKey: 'temprole',
  },
  tempvoice: {
    key: 'tempvoice',
    accent: 'sky',
    icon: Volume2,
    labelKey: 'tempvoice',
  },
  unknown: {
    key: 'unknown',
    accent: 'slate',
    icon: Bot,
    labelKey: 'unknown',
  },
};

/** Map raw API / Prisma type strings → canonical UI key */
const RAW_ALIASES: Record<string, BotTypeKey> = {
  apply: 'applications',
  applications: 'applications',
  application: 'applications',
  system: 'system',
  giveaway: 'giveaway',
  log: 'logs',
  logs: 'logs',
  ticket: 'ticket',
  protection: 'protection',
  protect: 'protection',
  guard: 'protection',
  stock: 'stock',
  azkar: 'muslim',
  muslim: 'muslim',
  autoline: 'autoline',
  feedback: 'feedback',
  offer: 'offer',
  package: 'package',
  selfrole: 'selfrole',
  suggestion: 'suggestion',
  tax: 'tax',
  temprole: 'temprole',
  tempvoice: 'tempvoice',
};

export function resolveBotTypeKey(raw?: string | null): BotTypeKey {
  const normalized = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  // Empty/missing type is unknown — never assume Apply (breaks Muslim sidebar)
  if (!normalized) return 'unknown';
  return RAW_ALIASES[normalized] ?? 'unknown';
}

export function getBotTypeConfig(raw?: string | null): BotTypeConfig {
  return BY_CANONICAL[resolveBotTypeKey(raw)];
}

export function truncateBotId(id: string, head = 8, tail = 4): string {
  if (!id || id.length <= head + tail + 1) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}
