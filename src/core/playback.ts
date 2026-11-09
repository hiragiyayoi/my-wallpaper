/**
 * 再生状態とターンテーブル表現の対応 (F-002-4 / F-002-5 / F-002-11)
 *
 * 見た目の状態遷移を純粋関数として切り出し、DOM に依存せずテストできるようにする。
 * CSS 側は data-state 属性と animation-play-state で表現する (F-004-5)。
 */

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

/** レコードの回転状態 (F-002-4: 再生中に回転, F-002-5: 一時停止で停止) */
export function discMotion(state: PlaybackState): 'running' | 'paused' {
  return state === 'playing' ? 'running' : 'paused';
}

/** トーンアームの角度 (F-002-11: 再生時にレコード上、待機・エラー時は退避位置) */
export function toneArmAngle(state: PlaybackState): number {
  return state === 'playing' || state === 'paused' ? 0 : -18;
}

/** 音量を 0.0-1.0 に正規化する (F-002-10) */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

/** オーバーレイ透明度を 0.0-1.0 に正規化する (F-001-7 / M-014) */
export function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) return 0.4;
  return Math.min(1, Math.max(0, value));
}

/** HTMLMediaElement のイベント名から再生状態へ写像する */
export function playbackStateFromEvent(eventName: string): PlaybackState | null {
  switch (eventName) {
    case 'loadeddata':
      return 'paused';
    case 'play':
    case 'playing':
      return 'playing';
    case 'pause':
      return 'paused';
    case 'ended':
      return 'ended';
    case 'error':
      return 'error';
    case 'waiting':
      return 'loading';
    default:
      return null;
  }
}
