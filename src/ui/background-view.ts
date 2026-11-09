/**
 * 背景画像の表示 (F-001-6 / F-001-7)
 *
 * 表示モードの最背面に背景画像と半透明オーバーレイを描画する。
 */

import { clampOpacity } from '../core/playback.js';

export interface BackgroundView {
  setImage(url: string | null): void;
  setOverlayOpacity(opacity: number): void;
}

export function createBackgroundView(root: HTMLElement): BackgroundView {
  const image = document.createElement('img');
  image.className = 'background-image';
  image.dataset['role'] = 'background-image';
  image.alt = '';
  image.style.objectFit = 'cover';
  image.style.display = 'none';
  image.decoding = 'async';

  const overlay = document.createElement('div');
  overlay.className = 'background-overlay';
  overlay.dataset['role'] = 'overlay';
  overlay.style.opacity = '0.4';

  root.append(image, overlay);

  return {
    setImage(url: string | null) {
      if (url === null) {
        image.style.display = 'none';
        image.removeAttribute('src');
        return;
      }
      image.style.display = '';
      image.src = url;
    },
    setOverlayOpacity(opacity: number) {
      overlay.style.opacity = String(clampOpacity(opacity));
    },
  };
}
