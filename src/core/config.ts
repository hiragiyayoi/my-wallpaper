/**
 * 設定の正規化 (F-005)
 *
 * 保存された値・外部入力 (ホストプロパティ) は壊れている可能性があるため、
 * 読み込み時に必ずデフォルトへマージし、要件上の固定値を強制する。
 */

import { DEFAULT_CONFIG, type ClockFormat, type WallpaperConfig } from '../types.js';
import { clampOpacity, clampVolume } from './playback.js';

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** null も「未設定」として許容する */
function nullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clockFormat(value: unknown): ClockFormat {
  return value === '12h' || value === '24h' ? value : DEFAULT_CONFIG.clock.format;
}

export function normalizeConfig(raw: unknown): WallpaperConfig {
  if (!isRecord(raw)) return { ...DEFAULT_CONFIG, video: { ...DEFAULT_CONFIG.video }, clock: { ...DEFAULT_CONFIG.clock }, performance: { ...DEFAULT_CONFIG.performance } };

  const video = isRecord(raw['video']) ? raw['video'] : {};
  const clock = isRecord(raw['clock']) ? raw['clock'] : {};
  const performance = isRecord(raw['performance']) ? raw['performance'] : {};

  return {
    backgroundImage: nullableStr(raw['backgroundImage']),
    // F-005-4: cover 固定
    backgroundFit: 'cover',
    overlayOpacity: clampOpacity(num(raw['overlayOpacity'], DEFAULT_CONFIG.overlayOpacity)),
    video: {
      src: nullableStr(video['src']),
      title: str(video['title'], DEFAULT_CONFIG.video.title),
      creator: str(video['creator'], DEFAULT_CONFIG.video.creator),
      // F-005-5: ループは常に有効
      loop: true,
      muted: bool(video['muted'], DEFAULT_CONFIG.video.muted),
      volume: clampVolume(num(video['volume'], DEFAULT_CONFIG.video.volume)),
    },
    clock: {
      format: clockFormat(clock['format']),
      showDate: bool(clock['showDate'], DEFAULT_CONFIG.clock.showDate),
    },
    performance: {
      pauseOnHidden: bool(performance['pauseOnHidden'], DEFAULT_CONFIG.performance.pauseOnHidden),
    },
  };
}

/** 設定の複製 (ネストしたオブジェクトを含む) */
export function cloneConfig(config: WallpaperConfig): WallpaperConfig {
  return {
    ...config,
    video: { ...config.video },
    clock: { ...config.clock },
    performance: { ...config.performance },
  };
}
