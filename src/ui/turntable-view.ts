/**
 * ターンテーブル UI (F-002-3〜F-002-11)
 *
 * レコード盤は CSS アニメーションで回転させる (F-004-5)。
 * 回転の開始・停止は animation-play-state の切替のみで行い、
 * JS で毎フレーム描画しない。
 */

import { discMotion, toneArmAngle, type PlaybackState } from '../core/playback.js';

export interface TrackInfo {
  title: string;
  creator: string;
}

export interface TurntableView {
  readonly video: HTMLVideoElement;
  setPlaybackState(state: PlaybackState): void;
  setTrackInfo(info: TrackInfo): void;
  setVideoSource(url: string | null): void;
}

const PLACEHOLDER = '未設定';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  role: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.dataset['role'] = role;
  return node;
}

export function createTurntableView(root: HTMLElement): TurntableView {
  const container = document.createElement('section');
  container.className = 'turntable';
  container.setAttribute('aria-label', 'ターンテーブル');

  // レコード盤
  const platter = el('div', 'turntable__platter', 'platter');

  const video = document.createElement('video');
  video.className = 'turntable__video';
  video.dataset['role'] = 'video';
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.preload = 'auto';
  video.setAttribute('aria-label', '再生中の動画');

  const disc = el('div', 'turntable__disc', 'disc');
  disc.style.animationPlayState = 'paused';
  disc.append(video);

  const spindle = el('div', 'turntable__spindle', 'spindle');
  disc.append(spindle);

  const arm = el('div', 'turntable__arm', 'tone-arm');
  arm.style.transform = `rotate(${toneArmAngle('idle')}deg)`;
  const armHead = el('div', 'turntable__arm-head', 'tone-arm-head');
  arm.append(armHead);

  platter.append(disc, arm);

  // トラック情報
  const info = document.createElement('div');
  info.className = 'turntable__info';

  const title = el('h2', 'turntable__title', 'title');
  title.textContent = PLACEHOLDER;

  const creator = el('p', 'turntable__creator', 'creator');
  creator.textContent = PLACEHOLDER;

  info.append(title, creator);
  container.append(platter, info);
  root.append(container);

  let currentState: PlaybackState = 'idle';
  // 現在の状態は data-state 属性としても公開する
  container.dataset['initialState'] = currentState;

  return {
    video,
    setPlaybackState(state: PlaybackState) {
      currentState = state;
      disc.dataset['state'] = state;
      disc.style.animationPlayState = discMotion(state);
      arm.style.transform = `rotate(${toneArmAngle(state)}deg)`;
      video.dataset['state'] = state;
      container.dataset['state'] = state;
    },
    setTrackInfo(next: TrackInfo) {
      title.textContent = next.title.length > 0 ? next.title : PLACEHOLDER;
      title.title = next.title;
      creator.textContent = next.creator.length > 0 ? next.creator : PLACEHOLDER;
      creator.title = next.creator;
    },
    setVideoSource(url: string | null) {
      if (url === null) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        return;
      }
      video.src = url;
    },
  };
}

/** 現在の状態 (テスト・デバッグ用) */
export function currentPlaybackState(video: HTMLVideoElement): PlaybackState {
  return (video.dataset['state'] as PlaybackState | undefined) ?? 'idle';
}
