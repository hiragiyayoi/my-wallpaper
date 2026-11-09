/**
 * アプリケーションの組み立て (M-001 / M-002 / M-003)
 *
 * 表示モード (背景・ターンテーブル・時計) と
 * 設定・操作モード (config-panel) を分離して構成する。
 */

import { createHostAdapter, type ConfigPatch, type HostAdapter } from './adapters/host.js';
import { formatClock } from './core/clock.js';
import { cloneConfig, normalizeConfig } from './core/config.js';
import { checkImageFile, checkVideoFile } from './core/files.js';
import { resolveVideoMetadata } from './core/metadata.js';
import { parseMp4Metadata } from './core/mp4-metadata.js';
import { clampVolume, type PlaybackState } from './core/playback.js';
import { ConfigStore, createIdbDriver, type StorageDriver } from './storage/config-store.js';
import type { ClockFormat, WallpaperConfig } from './types.js';
import { createBackgroundView } from './ui/background-view.js';
import { createClockTicker } from './ui/clock-ticker.js';
import { createClockView } from './ui/clock-view.js';
import { createConfigPanel } from './ui/config-panel.js';
import { createTurntableView } from './ui/turntable-view.js';

export interface AppOptions {
  driver?: StorageDriver;
  now?: () => Date;
  locale?: string;
  /** ホスト判定に使うグローバル (テストで差し替え可能) */
  host?: unknown;
  /** 起動時に設定パネルを開くか (開発時のみ) */
  openConfigOnStart?: boolean;
}

export interface App {
  readonly config: WallpaperConfig;
  getConfig(): WallpaperConfig;
  openConfig(): void;
  closeConfig(): void;
  handleImageFile(file: File): Promise<void>;
  handleVideoFile(file: File): Promise<void>;
  setTrackInfo(info: { title: string; creator: string }): void;
  setClockFormat(format: ClockFormat): void;
  setShowDate(show: boolean): void;
  setOverlayOpacity(opacity: number): void;
  setPauseOnHidden(value: boolean): void;
  setPlaying(playing: boolean): void;
  handleVisibilityChange(state: 'visible' | 'hidden'): void;
  flush(): Promise<void>;
  /** 保存済み設定の復元完了を待つ */
  ready: Promise<void>;
  dispose(): void;
}

const VIDEO_TRACKED_EVENTS = [
  'loadeddata',
  'play',
  'playing',
  'pause',
  'ended',
  'error',
  'waiting',
  'timeupdate',
  'durationchange',
  'loadedmetadata',
] as const;

export function createApp(root: HTMLElement, options: AppOptions = {}): App {
  const now = options.now ?? (() => new Date());
  const locale = options.locale;
  const hostCandidate = options.host ?? globalThis;
  const adapter: HostAdapter = createHostAdapter(hostCandidate);
  const driver = options.driver ?? createIdbDriver() ?? undefined;

  let config: WallpaperConfig = normalizeConfig(undefined);
  const store = driver ? new ConfigStore(driver) : null;

  // --- 表示モード ---
  const display = document.createElement('div');
  display.className = 'display';
  display.dataset['host'] = adapter.id;

  const backgroundView = createBackgroundView(display);
  const turntableView = createTurntableView(display);
  const clockView = createClockView(display);

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'button button--floating';
  toggleButton.dataset['role'] = 'open-config';
  toggleButton.textContent = '設定を開く';
  toggleButton.setAttribute('aria-label', '設定パネルを開く');
  toggleButton.addEventListener('click', () => openConfig());
  display.append(toggleButton);

  // --- 設定・操作モード ---
  const panel = createConfigPanel(root, {
    onImageSelected: (file) => void handleImageFile(file),
    onVideoSelected: (file) => void handleVideoFile(file),
    onTrackInfoChanged: (info) => setTrackInfo(info),
    onClockFormatChanged: (format) => setClockFormat(format),
    onShowDateChanged: (show) => setShowDate(show),
    onOverlayOpacityChanged: (opacity) => setOverlayOpacity(opacity),
    onTogglePlay: () => togglePlay(),
    onSeek: (seconds) => {
      turntableView.video.currentTime = seconds;
    },
    onVolumeChanged: (volume) => setVolume(volume),
    onUnmute: () => unmute(),
    onClose: () => closeConfig(),
  });

  root.prepend(display);

  // --- 時計 ---
  const ticker = createClockTicker({
    now,
    onTick: (current) => {
      clockView.setDisplay(
        formatClock(current, {
          format: config.clock.format,
          showDate: config.clock.showDate,
          ...(locale === undefined ? {} : { locale }),
        }),
      );
    },
  });
  ticker.start();

  // --- 動画イベント ---
  let playbackState: PlaybackState = 'idle';
  let lastVolume = 1;
  let objectUrl: string | null = null;

  function applyPlaybackState(state: PlaybackState): void {
    playbackState = state;
    turntableView.setPlaybackState(state);
    panel.setPlaying(state === 'playing');
  }

  const video = turntableView.video;
  for (const eventName of VIDEO_TRACKED_EVENTS) {
    video.addEventListener(eventName, () => {
      if (eventName === 'timeupdate' || eventName === 'durationchange' || eventName === 'loadedmetadata') {
        panel.setSeek(video.currentTime, Number.isFinite(video.duration) ? video.duration : 0);
        return;
      }
      if (eventName === 'play' || eventName === 'playing') applyPlaybackState('playing');
      else if (eventName === 'pause') applyPlaybackState('paused');
      else if (eventName === 'ended') applyPlaybackState('paused');
      else if (eventName === 'error') applyPlaybackState('error');
      else if (eventName === 'waiting') applyPlaybackState('loading');
      else if (eventName === 'loadeddata') applyPlaybackState('paused');
    });
  }

  function togglePlay(): void {
    if (video.paused) {
      void video.play().catch(() => {
        // 自動再生制限: ミュートで再試行する
        video.muted = true;
        panel.setMuted(true);
        void video.play().catch(() => applyPlaybackState('paused'));
      });
    } else {
      video.pause();
    }
  }

  function setVolume(volume: number): void {
    const normalized = clampVolume(volume);
    config.video.volume = normalized;
    lastVolume = normalized;
    video.volume = normalized;
    if (normalized > 0 && video.muted) {
      video.muted = false;
      config.video.muted = false;
      panel.setMuted(false);
    }
    void persist();
  }

  function unmute(): void {
    video.muted = !video.muted;
    config.video.muted = video.muted;
    if (!video.muted && video.volume === 0) {
      video.volume = lastVolume;
      config.video.volume = lastVolume;
    }
    panel.setMuted(video.muted);
    void persist();
  }

  // --- 設定操作 ---
  function applyPatchToViews(): void {
    backgroundView.setOverlayOpacity(config.overlayOpacity);
    turntableView.setTrackInfo({ title: config.video.title, creator: config.video.creator });
    if (video.volume !== config.video.volume) video.volume = config.video.volume;
    if (video.muted !== config.video.muted) video.muted = config.video.muted;
    panel.setMuted(config.video.muted);
    panel.applyConfig({
      title: config.video.title,
      creator: config.video.creator,
      clockFormat: config.clock.format,
      showDate: config.clock.showDate,
      overlayOpacity: config.overlayOpacity,
      volume: config.video.volume,
    });
  }

  let persistHandle: ReturnType<typeof setTimeout> | null = null;
  function persist(): Promise<void> {
    if (!store) return Promise.resolve();
    if (persistHandle !== null) clearTimeout(persistHandle);
    return new Promise((resolve) => {
      persistHandle = setTimeout(() => {
        persistHandle = null;
        store
          .save(cloneConfig(config))
          .catch((error: unknown) => {
            panel.showError(
              error instanceof Error ? error.message : '設定の保存に失敗しました。',
            );
          })
          .finally(resolve);
      }, 0);
    });
  }

  async function flush(): Promise<void> {
    if (persistHandle !== null) {
      clearTimeout(persistHandle);
      persistHandle = null;
    }
    if (store) await store.save(cloneConfig(config));
  }

  function mergePatch(patch: ConfigPatch): void {
    const merged: Record<string, unknown> = { ...config };
    for (const [key, value] of Object.entries(patch)) {
      if (key === 'video' || key === 'clock') {
        merged[key] = { ...(config[key] as object), ...(value as object) };
      } else if (value !== undefined) {
        merged[key] = value;
      }
    }
    config = normalizeConfig(merged);
    applyPatchToViews();
    void persist();
  }

  function setTrackInfo(info: { title: string; creator: string }): void {
    config.video.title = info.title;
    config.video.creator = info.creator;
    turntableView.setTrackInfo({ title: info.title, creator: info.creator });
    void persist();
  }

  function setClockFormat(format: ClockFormat): void {
    config.clock.format = format;
    clockView.setDisplay(
      formatClock(now(), {
        format: config.clock.format,
        showDate: config.clock.showDate,
        ...(locale === undefined ? {} : { locale }),
      }),
    );
    panel.applyConfig({
      title: config.video.title,
      creator: config.video.creator,
      clockFormat: format,
      showDate: config.clock.showDate,
      overlayOpacity: config.overlayOpacity,
      volume: config.video.volume,
    });
    void persist();
  }

  function setShowDate(show: boolean): void {
    config.clock.showDate = show;
    clockView.setDisplay(
      formatClock(now(), {
        format: config.clock.format,
        showDate: show,
        ...(locale === undefined ? {} : { locale }),
      }),
    );
    void persist();
  }

  function setOverlayOpacity(opacity: number): void {
    backgroundView.setOverlayOpacity(opacity);
    config.overlayOpacity = clampOpacitySafe(opacity);
    void persist();
  }

  function setPauseOnHidden(value: boolean): void {
    config.performance.pauseOnHidden = value;
    void persist();
  }

  function openConfig(): void {
    panel.setVisible(true);
  }

  function closeConfig(): void {
    panel.setVisible(false);
  }

  async function handleImageFile(file: File): Promise<void> {
    const check = checkImageFile(file);
    if (!check.ok) {
      panel.showError(check.message);
      return;
    }
    panel.showError(null);
    const url = URL.createObjectURL(file);
    backgroundView.setImage(url);
    config.backgroundImage = url;
    if (store) {
      try {
        await store.saveBackground(file);
      } catch (error) {
        panel.showError(error instanceof Error ? error.message : '画像の保存に失敗しました。');
      }
    }
  }

  async function handleVideoFile(file: File): Promise<void> {
    const check = checkVideoFile(file, adapter.id);
    if (!check.ok) {
      panel.showError(check.message);
      return;
    }
    panel.showError(null);

    const embedded = await readEmbeddedMetadata(file);
    const resolved = resolveVideoMetadata({
      ...(embedded === undefined ? {} : { embedded }),
      filename: file.name,
    });

    if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    config.video.src = objectUrl;
    config.video.title = resolved.title;
    config.video.creator = resolved.creator;

    turntableView.setVideoSource(objectUrl);
    turntableView.setTrackInfo(resolved);
    panel.applyConfig({
      title: resolved.title,
      creator: resolved.creator,
      clockFormat: config.clock.format,
      showDate: config.clock.showDate,
      overlayOpacity: config.overlayOpacity,
      volume: config.video.volume,
    });

    if (store) {
      try {
        await store.saveVideo(file, file.name);
      } catch (error) {
        panel.showError(error instanceof Error ? error.message : '動画の保存に失敗しました。');
      }
    }
    await persist();
  }

  async function readEmbeddedMetadata(file: File) {
    if (!file.name.toLowerCase().endsWith('.mp4') && file.type !== 'video/mp4') return undefined;
    try {
      const header = new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer());
      return parseMp4Metadata(header);
    } catch {
      return undefined;
    }
  }

  function handleVisibilityChange(state: 'visible' | 'hidden'): void {
    if (!config.performance.pauseOnHidden) return;
    if (state === 'hidden') {
      turntableView.setPlaybackState('paused');
    } else if (playbackState === 'playing') {
      turntableView.setPlaybackState('playing');
    }
  }

  // --- ホスト連携 ---
  const unsubscribe = adapter.subscribe((patch) => mergePatch(patch));

  // --- 復元 ---
  let resolveReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  if (store) {
    void store.load().then((loaded) => {
      config = loaded.config;
      if (loaded.background) {
        const url = URL.createObjectURL(loaded.background);
        backgroundView.setImage(url);
        config.backgroundImage = url;
      }
      if (loaded.video) {
        objectUrl = URL.createObjectURL(loaded.video);
        config.video.src = objectUrl;
        turntableView.setVideoSource(objectUrl);
      }
      if (config.video.title === '' && config.video.creator === '' && loaded.videoFileName !== '') {
        const resolved = resolveVideoMetadata({ filename: loaded.videoFileName });
        config.video.title = resolved.title;
        config.video.creator = resolved.creator;
      }
      applyPatchToViews();
      clockView.setDisplay(
        formatClock(now(), {
          format: config.clock.format,
          showDate: config.clock.showDate,
          ...(locale === undefined ? {} : { locale }),
        }),
      );
      if (options.openConfigOnStart) openConfig();
    }).finally(resolveReady);
  } else {
    if (options.openConfigOnStart) openConfig();
    resolveReady();
  }

  applyPatchToViews();

  return {
    get config() {
      return config;
    },
    getConfig() {
      return cloneConfig(config);
    },
    openConfig,
    closeConfig,
    handleImageFile,
    handleVideoFile,
    setTrackInfo,
    setClockFormat,
    setShowDate,
    setOverlayOpacity,
    setPauseOnHidden,
    setPlaying(playing: boolean) {
      applyPlaybackState(playing ? 'playing' : 'paused');
      turntableView.setPlaybackState(playing ? 'playing' : 'paused');
    },
    handleVisibilityChange,
    flush,
    ready,
    dispose() {
      ticker.stop();
      unsubscribe();
      video.pause();
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    },
  };
}

function clampOpacitySafe(value: number): number {
  if (!Number.isFinite(value)) return 0.4;
  return Math.min(1, Math.max(0, value));
}
