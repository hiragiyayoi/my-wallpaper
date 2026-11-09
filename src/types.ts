/**
 * 壁紙設定のデータモデル (F-005)
 *
 * REQUIREMENTS.md v2.3 §4.5 に基づく。
 * 型定義そのものは DESIGN.md §1 のドラフトに由来する。
 */

export type ClockFormat = '12h' | '24h';

/**
 * 実行ホストの識別子 (T-001〜T-006)
 * Tier 1: wallpaper-engine / lively / plash
 * Tier 2-3 (HTML/JS 非対応) は本アプリの実行対象外
 */
export type HostId = 'wallpaper-engine' | 'lively' | 'plash' | 'browser';

export interface VideoConfig {
  /** 保存済み動画の参照。復元時に再生成される */
  src: string | null;
  title: string;
  creator: string;
  /** F-005-5: 常に有効 (変更不可) */
  loop: true;
  /** F-005-6: 初期状態はミュート */
  muted: boolean;
  /** 0.0 - 1.0 */
  volume: number;
}

export interface ClockConfig {
  format: ClockFormat;
  showDate: boolean;
}

export interface PerformanceConfig {
  pauseOnHidden: boolean;
}

export interface WallpaperConfig {
  backgroundImage: string | null;
  /** F-005-4: cover 固定 */
  backgroundFit: 'cover';
  /** 0.0 - 1.0 */
  overlayOpacity: number;
  video: VideoConfig;
  clock: ClockConfig;
  performance: PerformanceConfig;
}

/** F-005-3: デフォルト値 */
export const DEFAULT_CONFIG: WallpaperConfig = {
  backgroundImage: null,
  backgroundFit: 'cover',
  overlayOpacity: 0.4,
  video: {
    src: null,
    title: '',
    creator: '',
    loop: true,
    muted: true,
    volume: 1,
  },
  clock: {
    format: '24h',
    showDate: true,
  },
  performance: {
    pauseOnHidden: true,
  },
};

/** 制約: F-001 例外処理 (背景画像の上限) */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
/** 制約: F-002 例外処理 (動画の上限) */
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
