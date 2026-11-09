/**
 * ホストアダプター (M-015〜M-018 / NF-009)
 *
 * コアロジックは標準 Web API のみを使い、ホスト固有 API はこの層に隔離する。
 * ホスト API は feature detection で存在確認してから触る。
 */

import { clampOpacity, clampVolume } from '../core/playback.js';
import type { ClockFormat, HostId, WallpaperConfig } from '../types.js';

export type ConfigPatch = Partial<Omit<WallpaperConfig, 'video' | 'clock'>> & {
  video?: Partial<WallpaperConfig['video']>;
  clock?: Partial<WallpaperConfig['clock']>;
};

export interface HostAdapter {
  readonly id: HostId;
  readonly label: string;
  /** 設定変更 (ホストプロパティ) の購読。戻り値は解除関数 */
  subscribe(callback: (patch: ConfigPatch) => void): () => void;
}

interface WallpaperEngineProperty {
  value?: unknown;
}

type WallpaperEngineProperties = Record<string, WallpaperEngineProperty>;

interface WallpaperEngineListener {
  applyUserProperties?: (properties: WallpaperEngineProperties) => void;
}

interface HostWindow {
  wallpaperPropertyListener?: WallpaperEngineListener;
  livelyPropertyListener?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asClockFormat(value: unknown): ClockFormat | undefined {
  return value === '12h' || value === '24h' ? value : undefined;
}

/** 設定パッチに値を積む (undefined のフィールドは作らない) */
function putVideo(patch: ConfigPatch, key: keyof WallpaperConfig['video'], value: unknown): void {
  if (value === undefined) return;
  patch.video ??= {};
  (patch.video as Record<string, unknown>)[key] = value;
}

function putClock(patch: ConfigPatch, key: keyof WallpaperConfig['clock'], value: unknown): void {
  if (value === undefined) return;
  patch.clock ??= {};
  (patch.clock as Record<string, unknown>)[key] = value;
}

/**
 * Wallpaper Engine の User Properties を設定パッチへ変換する。
 * プロパティ名は WE の慣習に合わせて小文字。
 */
export function mapWallpaperEngineProperties(properties: WallpaperEngineProperties): ConfigPatch {
  const patch: ConfigPatch = {};

  for (const [name, raw] of Object.entries(properties)) {
    const value = raw?.value;
    switch (name) {
      case 'backgroundimage': {
        const text = asString(value);
        if (text !== undefined) patch.backgroundImage = text.length > 0 ? text : null;
        break;
      }
      case 'overlayopacity': {
        const num = asNumber(value);
        if (num !== undefined) patch.overlayOpacity = clampOpacity(num);
        break;
      }
      case 'videotitle':
        putVideo(patch, 'title', asString(value));
        break;
      case 'videocreator':
        putVideo(patch, 'creator', asString(value));
        break;
      case 'volume': {
        const num = asNumber(value);
        if (num !== undefined) putVideo(patch, 'volume', clampVolume(num));
        break;
      }
      case 'muted':
        putVideo(patch, 'muted', asBoolean(value));
        break;
      case 'clockformat':
        putClock(patch, 'format', asClockFormat(value));
        break;
      case 'showdate':
        putClock(patch, 'showDate', asBoolean(value));
        break;
      default:
        break;
    }
  }

  return patch;
}

/** Lively の livelyproperties.json のプロパティ (camelCase) を設定パッチへ変換する */
export function mapLivelyProperty(name: string, value: unknown): ConfigPatch {
  const patch: ConfigPatch = {};

  switch (name) {
    case 'backgroundImage': {
      const text = asString(value);
      if (text !== undefined) patch.backgroundImage = text.length > 0 ? text : null;
      break;
    }
    case 'overlayOpacity': {
      const num = asNumber(value);
      if (num !== undefined) patch.overlayOpacity = clampOpacity(num);
      break;
    }
    case 'videoTitle':
      putVideo(patch, 'title', asString(value));
      break;
    case 'videoCreator':
      putVideo(patch, 'creator', asString(value));
      break;
    case 'volume': {
      const num = asNumber(value);
      if (num !== undefined) putVideo(patch, 'volume', clampVolume(num));
      break;
    }
    case 'muted':
      putVideo(patch, 'muted', asBoolean(value));
      break;
    case 'clockFormat':
      putClock(patch, 'format', asClockFormat(value));
      break;
    case 'showDate':
      putClock(patch, 'showDate', asBoolean(value));
      break;
    default:
      break;
  }

  return patch;
}

/** 実行ホストを判定する (Tier 1 のみ対象。判定できない場合は browser) */
export function detectHost(candidate: unknown = globalThis): HostId {
  if (!isObject(candidate)) return 'browser';
  const win = candidate as HostWindow;
  if (win.wallpaperPropertyListener !== undefined) return 'wallpaper-engine';
  if (win.livelyPropertyListener !== undefined) return 'lively';
  return 'browser';
}

const LABELS: Record<HostId, string> = {
  'wallpaper-engine': 'Wallpaper Engine',
  lively: 'Lively Wallpaper',
  plash: 'Plash',
  browser: 'Browser',
};

class BrowserAdapter implements HostAdapter {
  readonly id: HostId = 'browser';
  readonly label = LABELS.browser;
  subscribe(): () => void {
    return () => {};
  }
}

class WallpaperEngineAdapter implements HostAdapter {
  readonly id: HostId = 'wallpaper-engine';
  readonly label = LABELS['wallpaper-engine'];
  private readonly subscribers = new Set<(patch: ConfigPatch) => void>();

  constructor(listener: WallpaperEngineListener) {
    // 既存の applyUserProperties を壊さないようラップする
    const original = listener.applyUserProperties;
    listener.applyUserProperties = (properties) => {
      original?.call(listener, properties);
      const patch = mapWallpaperEngineProperties(properties);
      for (const subscriber of this.subscribers) subscriber(patch);
    };
  }

  subscribe(callback: (patch: ConfigPatch) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}

class LivelyAdapter implements HostAdapter {
  readonly id: HostId = 'lively';
  readonly label = LABELS.lively;
  private readonly subscribers = new Set<(patch: ConfigPatch) => void>();

  constructor(win: Record<string, unknown>) {
    const previous = win['livelyPropertyListener'];
    const handler = (name: unknown, value: unknown) => {
      if (typeof previous === 'function') {
        (previous as (n: unknown, v: unknown) => void)(name, value);
      }
      if (typeof name !== 'string') return;
      const patch = mapLivelyProperty(name, value);
      if (Object.keys(patch).length === 0) return;
      for (const subscriber of this.subscribers) subscriber(patch);
    };
    win['livelyPropertyListener'] = handler;
  }

  subscribe(callback: (patch: ConfigPatch) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}

export function createHostAdapter(candidate: unknown = globalThis): HostAdapter {
  const host = detectHost(candidate);
  if (!isObject(candidate)) return new BrowserAdapter();
  const win = candidate as HostWindow;

  if (host === 'wallpaper-engine' && isObject(win.wallpaperPropertyListener)) {
    return new WallpaperEngineAdapter(win.wallpaperPropertyListener);
  }
  if (host === 'lively') {
    return new LivelyAdapter(candidate as Record<string, unknown>);
  }
  return new BrowserAdapter();
}
