import { describe, expect, it } from 'vitest';
import { createBackgroundView } from './background-view.js';

describe('createBackgroundView (F-001-6 / F-001-7)', () => {
  it('画像 URL を背景に設定する', () => {
    const root = document.createElement('div');
    const view = createBackgroundView(root);
    view.setImage('blob:http://localhost/abc');

    const image = root.querySelector<HTMLImageElement>('[data-role="background-image"]');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('src')).toBe('blob:http://localhost/abc');
    expect(image?.style.display).toBe('');
  });

  it('null を設定すると画像を隠す', () => {
    const root = document.createElement('div');
    const view = createBackgroundView(root);
    view.setImage('blob:x');
    view.setImage(null);
    const image = root.querySelector<HTMLImageElement>('[data-role="background-image"]');
    expect(image?.style.display).toBe('none');
  });

  it('画像は cover で全面を覆う (F-001-6 / F-005-4)', () => {
    const root = document.createElement('div');
    createBackgroundView(root);
    const image = root.querySelector<HTMLImageElement>('[data-role="background-image"]');
    expect(image?.style.objectFit).toBe('cover');
  });

  it('オーバーレイの透明度を 0-1 に丸めて適用する (F-001-7)', () => {
    const root = document.createElement('div');
    const view = createBackgroundView(root);
    const overlay = root.querySelector<HTMLElement>('[data-role="overlay"]');
    expect(overlay).not.toBeNull();

    view.setOverlayOpacity(0.75);
    expect(overlay?.style.opacity).toBe('0.75');

    view.setOverlayOpacity(5);
    expect(overlay?.style.opacity).toBe('1');

    view.setOverlayOpacity(Number.NaN);
    expect(overlay?.style.opacity).toBe('0.4');
  });

  it('画像要素は alt 属性を持つ (アクセシビリティ)', () => {
    const root = document.createElement('div');
    createBackgroundView(root);
    const image = root.querySelector<HTMLImageElement>('[data-role="background-image"]');
    expect(image?.alt).toBe('');
  });
});
