'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Hash,
  HandMetal,
  Image as ImageIcon,
  MessageSquare,
  Settings2,
} from 'lucide-react';
import {
  BotLoadError,
  BotPageSkeleton,
  SectionCard,
  SelectField,
} from '@/components/apply/BotFormBits';
import UnsavedChangesBar from '@/components/UnsavedChangesBar';
import FeatureEnableCard from '@/components/FeatureEnableCard';
import WelcomeCardBuilder from '@/components/system/welcome/WelcomeCardBuilder';
import WelcomeDiscordPreview from '@/components/system/welcome/WelcomeDiscordPreview';
import WelcomeMessageEditor from '@/components/system/welcome/WelcomeMessageEditor';
import {
  DEFAULT_AVATAR,
  DEFAULT_BACKGROUND,
  DEFAULT_OVERLAY,
  DEFAULT_TEXT,
  EMPTY_WELCOME,
  createTextLayer,
  legacyTextToLayer,
  textLayerToLegacy,
  type TextLayer,
  type WelcomeDraft,
} from '@/components/system/welcome/types';
import { useToast } from '@/hooks/useToast';
import { useUnsavedDraft } from '@/hooks/useUnsavedDraft';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';

type GuildOptions = {
  channels: Array<{ id: string; name: string; type: number }>;
};

function settingsToDraft(settings: Record<string, unknown>): WelcomeDraft {
  const legacyText = {
    ...DEFAULT_TEXT,
    ...(settings.text && typeof settings.text === 'object'
      ? (settings.text as typeof DEFAULT_TEXT)
      : {}),
  };
  let texts: TextLayer[] = [];
  if (Array.isArray(settings.texts) && settings.texts.length > 0) {
    texts = settings.texts.map((raw, i) => {
      const t = raw as Partial<TextLayer>;
      return createTextLayer({
        id: t.id || `txt_${i}`,
        name: t.name || `Text ${i + 1}`,
        content: t.content,
        x: t.x,
        y: t.y,
        size: t.size,
        color: t.color,
        align: t.align,
        fontWeight: t.fontWeight,
        fontFamily: t.fontFamily,
        opacity: t.opacity,
        rotation: t.rotation,
        shadow: t.shadow,
        visible: t.visible,
        locked: t.locked,
      });
    });
  } else {
    texts = [legacyTextToLayer(legacyText)];
  }

  return {
    enabled: Boolean(settings.enabled),
    channelId: String(settings.channelId || ''),
    message: String(settings.message || EMPTY_WELCOME.message),
    type:
      settings.type === 'message' || settings.type === 'image'
        ? settings.type
        : 'embed',
    caption: settings.caption !== false,
    hasBackground: Boolean(settings.hasBackground),
    backgroundUrl: settings.backgroundUrl ? String(settings.backgroundUrl) : null,
    background: {
      ...DEFAULT_BACKGROUND,
      ...(settings.background && typeof settings.background === 'object'
        ? (settings.background as typeof DEFAULT_BACKGROUND)
        : {}),
    },
    avatar: {
      ...DEFAULT_AVATAR,
      ...(settings.avatar && typeof settings.avatar === 'object'
        ? (settings.avatar as typeof DEFAULT_AVATAR)
        : {}),
    },
    texts,
    text: textLayerToLegacy(texts[0]),
    overlay: {
      ...DEFAULT_OVERLAY,
      ...(settings.overlay && typeof settings.overlay === 'object'
        ? (settings.overlay as typeof DEFAULT_OVERLAY)
        : {}),
    },
  };
}

function toPatch(d: WelcomeDraft): Record<string, unknown> {
  return {
    enabled: d.enabled,
    channelId: d.channelId,
    message: d.message,
    type: d.type,
    caption: d.caption,
    avatar: d.avatar,
    background: d.background,
    overlay: d.overlay,
    texts: d.texts,
    text: textLayerToLegacy(d.texts[0]),
  };
}

export default function WelcomeClient() {
  const { botId } = useParams<{ botId: string }>();
  const toast = useToast();
  const { t } = useI18n();
  const s = t.system;
  const W = t.welcome;
  const draft = useUnsavedDraft<WelcomeDraft>(EMPTY_WELCOME);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guildOpts, setGuildOpts] = useState<GuildOptions | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api<{ settings: Record<string, unknown> }>(
        `/system/${botId}/features/welcome`,
      );
      draft.hydrate(settingsToDraft(res.settings || {}));
      setHydrated(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [botId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    api<GuildOptions>(`/apply/${botId}/guild-options`)
      .then((opts) => {
        if (!cancelled) setGuildOpts(opts);
      })
      .catch(() => {
        if (!cancelled) setGuildOpts({ channels: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [botId]);

  const d = draft.draft;
  const textChannels = useMemo(
    () =>
      (guildOpts?.channels || []).filter(
        (c) => c.type === 0 || c.type === 5 || c.type === undefined,
      ),
    [guildOpts],
  );

  const variableLabels = useMemo(
    () => ({
      availableVariables: W.availableVariables,
      moreVariables: W.moreVariables,
      showPreview: W.showPreview,
      hidePreview: W.hidePreview,
      livePreview: W.livePreview,
      group_member: W.groupMember,
      group_server: W.groupServer,
      group_memberInfo: W.groupMemberInfo,
      varUser: W.varUser,
      varMention: W.varMention,
      varUsername: W.varUsername,
      varDisplayName: W.varDisplayName,
      varUserId: W.varUserId,
      varUserAvatar: W.varUserAvatar,
      varTag: W.varTag,
      varServer: W.varServer,
      varServerId: W.varServerId,
      varServerIcon: W.varServerIcon,
      varServerOwner: W.varServerOwner,
      varMemberCount: W.varMemberCount,
      varJoinedAt: W.varJoinedAt,
      varAccountCreated: W.varAccountCreated,
    }),
    [W],
  );

  const cardLabels = useMemo(
    () => ({
      ...variableLabels,
      backgroundSection: W.backgroundSection,
      avatarSection: W.avatarSection,
      textSection: W.textSection,
      uploadBg: s.uploadBackground,
      changeBg: s.changeBackground,
      removeBg: s.removeBackground,
      uploadHint: s.uploadBackgroundHint,
      uploading: s.uploadingBackground,
      dropHint: W.dropHint,
      avatarSize: s.avatarSize,
      avatarCircle: s.avatarCircle,
      avatarBorder: W.avatarBorder,
      avatarBorderWidth: W.avatarBorderWidth,
      avatarBorderColor: W.avatarBorderColor,
      avatarShadow: W.avatarShadow,
      avatarVisible: W.avatarVisible,
      avatarSampleNote: W.avatarSampleNote,
      textOnImage: s.textOnImage,
      textSize: s.textSize,
      textColor: s.textColor,
      textAlign: s.textAlign,
      alignLeft: s.alignLeft,
      alignCenter: s.alignCenter,
      alignRight: s.alignRight,
      textBold: W.textBold,
      textShadow: W.textShadow,
      captionWithImage: s.captionWithImage,
      preview: s.welcomePreview,
      previewHint: s.welcomePreviewHint,
      dragHint: s.welcomeDragHint,
      noBackground: s.noBackgroundYet,
      noBackgroundYet: s.noBackgroundYet,
      reset: W.reset,
      resetAll: W.resetAll,
      center: W.center,
      centerObject: W.centerObject,
      fit: W.fit,
      fitPreview: W.fitPreview,
      undo: W.undo,
      redo: W.redo,
      zoomIn: W.zoomIn,
      zoomOut: W.zoomOut,
      delete: W.delete,
      duplicate: W.duplicate,
      bringForward: W.bringForward,
      sendBackward: W.sendBackward,
      lock: W.lock,
      visibility: W.visibility,
      loadingPreview: W.loadingPreview,
      emptyTitle: W.emptyTitle,
      emptyBody: W.emptyBody,
      confirmReset: W.confirmReset,
      tab_background: W.tabBackground,
      tab_avatar: W.tabAvatar,
      tab_text: W.tabText,
      tab_effects: W.tabEffects,
      tab_layers: W.tabLayers,
      tab_advanced: W.tabAdvanced,
      bgFit: W.bgFit,
      bgFit_fill: W.bgFitFill,
      bgFit_cover: W.bgFitCover,
      bgFit_contain: W.bgFitContain,
      bgScale: W.bgScale,
      bgOffsetX: W.bgOffsetX,
      bgOffsetY: W.bgOffsetY,
      resetBackground: W.resetBackground,
      opacity: W.opacity,
      rotation: W.rotation,
      addText: W.addText,
      selectTextOrAdd: W.selectTextOrAdd,
      layerName: W.layerName,
      fontFamily: W.fontFamily,
      deleteText: W.deleteText,
      selectTextForEffects: W.selectTextForEffects,
      overlay: W.overlay,
      overlayColor: W.overlayColor,
      overlayOpacity: W.overlayOpacity,
      layersTitle: W.layersTitle,
      advancedNote: W.advancedNote,
      resetAllConfirm: W.resetAllConfirm,
    }),
    [W, s, variableLabels],
  );

  async function save() {
    setSaving(true);
    try {
      const res = await api<{ settings: Record<string, unknown> }>(
        `/system/${botId}/features/welcome`,
        {
          method: 'PATCH',
          body: JSON.stringify(toPatch(draft.draft)),
        },
      );
      draft.hydrate(settingsToDraft(res.settings || {}));
      toast.success(W.saved || s.saved);
    } catch (err: unknown) {
      toast.error(String((err as Error)?.message || t.errors.generic));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !hydrated) return <BotPageSkeleton />;
  if (loadError) {
    return (
      <BotLoadError message={t.errors.loadBot} onRetry={() => void load()} />
    );
  }

  const channelLabel = textChannels.find((c) => c.id === d.channelId)?.name;

  return (
    <div className="dashboard-page welcome-page space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t.nav.groupSystem}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          {s.welcome}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {W.subtitle || s.welcomeBody}
        </p>
      </header>

      <FeatureEnableCard
        icon={HandMetal}
        title={W.featureTitle}
        description={W.featureDesc}
        enabled={d.enabled}
        enabledLabel={W.statusEnabled}
        disabledLabel={W.statusDisabled}
        switchAriaLabel={W.toggleFeature}
        onEnabledChange={(enabled) => draft.setDraft({ ...d, enabled })}
      />

      <SectionCard
        title={W.generalSection}
        icon={Settings2}
        disabled={!d.enabled}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField
            label={s.channel}
            value={d.channelId}
            onChange={(channelId) => draft.setDraft({ ...d, channelId })}
            options={[
              { value: '', label: s.selectChannel },
              ...textChannels.map((c) => ({
                value: c.id,
                label: `#${c.name}`,
              })),
            ]}
          />
          <SelectField
            label={s.messageType}
            value={d.type}
            onChange={(v) =>
              draft.setDraft({
                ...d,
                type:
                  v === 'message' || v === 'image' ? v : 'embed',
              })
            }
            options={[
              { value: 'embed', label: s.typeEmbed },
              { value: 'message', label: s.typeMessage },
              { value: 'image', label: s.typeImage },
            ]}
          />
        </div>
        {channelLabel ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hash size={13} />
            {W.channelSelected}: #{channelLabel}
          </p>
        ) : null}
      </SectionCard>

      <SectionCard
        title={W.messageSection}
        icon={MessageSquare}
        disabled={!d.enabled}
      >
        <WelcomeMessageEditor
          label={s.welcomeMessage}
          hint={W.messageHint || s.welcomeHint}
          placeholder={W.messagePlaceholder}
          value={d.message}
          disabled={!d.enabled}
          variableLabels={variableLabels}
          onChange={(message) => draft.setDraft({ ...d, message })}
        />
      </SectionCard>

      {d.type === 'image' ? (
        <SectionCard
          title={W.cardBuilderSection}
          icon={ImageIcon}
          disabled={!d.enabled}
        >
          <WelcomeCardBuilder
            botId={String(botId)}
            disabled={!d.enabled}
            value={{
              type: d.type,
              message: d.message,
              caption: d.caption,
              hasBackground: d.hasBackground,
              backgroundUrl: d.backgroundUrl,
              background: d.background,
              avatar: d.avatar,
              text: d.text,
              texts: d.texts,
              overlay: d.overlay,
            }}
            labels={cardLabels}
            onChange={(patch) => draft.setDraft({ ...d, ...patch })}
            onUploaded={(settings) => {
              draft.hydrate(settingsToDraft(settings));
              toast.success(s.backgroundUploaded);
            }}
            onRemoved={(settings) => {
              draft.hydrate(settingsToDraft(settings));
              toast.success(s.backgroundRemoved);
            }}
            onError={(code) => {
              if (code === 'MAX_SIZE') toast.error(s.backgroundTooLarge);
              else if (code === 'BAD_TYPE') toast.error(s.backgroundBadType);
              else toast.error(t.errors.generic);
            }}
          />
        </SectionCard>
      ) : null}

      <SectionCard title={W.discordPreviewSection} icon={MessageSquare} disabled={!d.enabled}>
        <WelcomeDiscordPreview
          message={d.message}
          type={d.type}
          showImage={d.type === 'image' && d.hasBackground}
          caption={d.caption}
          labels={{
            appBadge: W.discordAppBadge,
            previewNote: W.discordPreviewNote,
          }}
        />
      </SectionCard>

      <UnsavedChangesBar
        open={draft.isDirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => draft.discard()}
      />
    </div>
  );
}
