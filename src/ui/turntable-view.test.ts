import { describe, expect, it } from 'vitest';
import { createTurntableView } from './turntable-view.js';

function setup() {
  const root = document.createElement('div');
  const view = createTurntableView(root);
  return { root, view };
}

describe('createTurntableView (F-002-3)', () => {
  it('レコード盤とトーンアームを描画する', () => {
    const { root } = setup();
    expect(root.querySelector('[data-role="disc"]')).not.toBeNull();
    expect(root.querySelector('[data-role="tone-arm"]')).not.toBeNull();
  });

  it('動画要素を持つ', () => {
    const { root } = setup();
    expect(root.querySelector('video')).not.toBeNull();
  });

  it('動画はミュート・ループ・インライン再生の初期状態を持つ (F-002-9 / F-005-6)', () => {
    const { root } = setup();
    const video = root.querySelector('video')!;
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.getAttribute('preload')).toBe('auto');
  });
});

describe('setPlaybackState (F-002-4 / F-002-5)', () => {
  it('再生中はレコードが回転し、停止中は止まる', () => {
    const { root, view } = setup();
    const disc = root.querySelector<HTMLElement>('[data-role="disc"]')!;

    view.setPlaybackState('playing');
    expect(disc.dataset['state']).toBe('playing');
    expect(disc.style.animationPlayState).toBe('running');

    view.setPlaybackState('paused');
    expect(disc.style.animationPlayState).toBe('paused');
  });

  it('トーンアームは再生中にレコード上、待機中に退避する (F-002-11)', () => {
    const { root, view } = setup();
    const arm = root.querySelector<HTMLElement>('[data-role="tone-arm"]')!;

    view.setPlaybackState('playing');
    expect(arm.style.transform).toContain('0deg');

    view.setPlaybackState('idle');
    expect(arm.style.transform).toContain('-18deg');
  });

  it('エラー時は再生ボタンを無効化する', () => {
    const { root, view } = setup();
    view.setPlaybackState('error');
    const video = root.querySelector('video')!;
    expect(video.dataset['state']).toBe('error');
  });
});

describe('setTrackInfo (F-002-6 / F-002-7)', () => {
  it('タイトルと制作者名を表示する', () => {
    const { root, view } = setup();
    view.setTrackInfo({ title: 'My Set', creator: 'DJ Someone' });

    expect(root.querySelector('[data-role="title"]')?.textContent).toBe('My Set');
    expect(root.querySelector('[data-role="creator"]')?.textContent).toBe('DJ Someone');
  });

  it('空のタイトル・制作者はプレースホルダを表示する', () => {
    const { root, view } = setup();
    view.setTrackInfo({ title: '', creator: '' });

    expect(root.querySelector('[data-role="title"]')?.textContent).toBe('未設定');
    expect(root.querySelector('[data-role="creator"]')?.textContent).toBe('未設定');
  });

  it('長いタイトルは切り詰めずに全文を title 属性へ入れる', () => {
    const { root, view } = setup();
    const long = 'あ'.repeat(120);
    view.setTrackInfo({ title: long, creator: 'c' });
    const title = root.querySelector<HTMLElement>('[data-role="title"]')!;
    expect(title.textContent).toBe(long);
    expect(title.title).toBe(long);
  });
});

describe('setVideoSource (F-002-12)', () => {
  it('動画 URL を設定する', () => {
    const { root, view } = setup();
    view.setVideoSource('blob:http://localhost/video');
    expect(root.querySelector('video')?.getAttribute('src')).toBe('blob:http://localhost/video');
  });

  it('null で動画を解除する', () => {
    const { root, view } = setup();
    view.setVideoSource('blob:x');
    view.setVideoSource(null);
    expect(root.querySelector('video')?.hasAttribute('src')).toBe(false);
  });
});
