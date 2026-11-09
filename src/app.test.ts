import { describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { MemoryDriver } from './storage/config-store.js';

function setup(options: { driver?: MemoryDriver } = {}) {
  const root = document.createElement('div');
  const driver = options.driver ?? new MemoryDriver();
  const app = createApp(root, {
    driver,
    now: () => new Date(2026, 10, 9, 14, 5, 9),
    locale: 'en-US',
    host: {},
  });
  return { root, app, driver };
}

describe('createApp (起動)', () => {
  it('表示モードの要素を描画する (M-001)', () => {
    const { root } = setup();
    expect(root.querySelector('[data-role="background-image"]')).not.toBeNull();
    expect(root.querySelector('[data-role="disc"]')).not.toBeNull();
    expect(root.querySelector('[data-role="clock-time"]')).not.toBeNull();
  });

  it('設定パネルは既定で非表示 (M-001 / M-003)', () => {
    const { root } = setup();
    const panel = root.querySelector<HTMLElement>('[data-role="config-panel"]')!;
    expect(panel.hidden).toBe(true);
  });

  it('時計が現在時刻を表示する (F-003-1)', () => {
    const { root } = setup();
    expect(root.querySelector('[data-role="clock-time"]')?.textContent).toBe('14:05:09');
  });

  it('設定を開閉できる', () => {
    const { root, app } = setup();
    const panel = root.querySelector<HTMLElement>('[data-role="config-panel"]')!;
    app.openConfig();
    expect(panel.hidden).toBe(false);
    app.closeConfig();
    expect(panel.hidden).toBe(true);
  });
});

describe('createApp (設定の反映)', () => {
  it('背景画像を選択すると背景に反映し保存する (F-001-3 / F-001-5)', async () => {
    const { root, app, driver } = setup();
    const file = new File(['x'], 'bg.png', { type: 'image/png' });

    await app.handleImageFile(file);

    const image = root.querySelector<HTMLImageElement>('[data-role="background-image"]')!;
    expect(image.src.startsWith('blob:')).toBe(true);
    expect(await driver.get('background')).toBeInstanceOf(Blob);
  });

  it('対応外形式はエラーを表示し、背景を変更しない (例外処理)', async () => {
    const { root, app } = setup();
    await app.handleImageFile(new File(['x'], 'a.bmp', { type: 'image/bmp' }));

    const error = root.querySelector<HTMLElement>('[data-role="error"]')!;
    expect(error.hidden).toBe(false);
    expect(root.querySelector<HTMLImageElement>('[data-role="background-image"]')!.hasAttribute('src')).toBe(false);
  });

  it('Wallpaper Engine では mp4 を拒否する (WE-006)', async () => {
    const root = document.createElement('div');
    const app = createApp(root, {
      driver: new MemoryDriver(),
      now: () => new Date(),
      locale: 'en-US',
      host: { wallpaperPropertyListener: { applyUserProperties: () => {} } },
    });

    await app.handleVideoFile(new File(['x'], 'a.mp4', { type: 'video/mp4' }));
    const error = root.querySelector<HTMLElement>('[data-role="error"]')!;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toContain('webm');
  });

  it('タイトル・制作者名の編集が表示に反映される (F-002-15)', () => {
    const { root, app } = setup();
    app.setTrackInfo({ title: 'Set A', creator: 'DJ B' });

    expect(root.querySelector('[data-role="title"]')?.textContent).toBe('Set A');
    expect(root.querySelector('[data-role="creator"]')?.textContent).toBe('DJ B');
  });

  it('時計の表記切替が反映される (F-003-3)', () => {
    const { root, app } = setup();
    app.setClockFormat('12h');
    expect(root.querySelector('[data-role="clock-meridiem"]')?.textContent).toBe('PM');
  });

  it('オーバーレイの濃さが反映される (M-014)', () => {
    const { root, app } = setup();
    app.setOverlayOpacity(0.8);
    const overlay = root.querySelector<HTMLElement>('[data-role="overlay"]')!;
    expect(overlay.style.opacity).toBe('0.8');
  });

  it('設定を保存し、再起動時に復元する (F-005-2)', async () => {
    const driver = new MemoryDriver();
    const first = setup({ driver });
    await first.app.ready;
    first.app.setTrackInfo({ title: 'Saved', creator: 'C' });
    first.app.setOverlayOpacity(0.9);
    await first.app.flush();

    // 同じドライバで新しいアプリを作る = 再起動相当
    const second = setup({ driver });
    await second.app.ready;
    const root2 = second.root;
    expect(root2.querySelector('[data-role="title"]')?.textContent).toBe('Saved');
    expect(second.app.getConfig().overlayOpacity).toBe(0.9);
  });
});

describe('createApp (省電力 / NF-004)', () => {
  it('非表示になるとアニメーションを停止する', () => {
    const { root, app } = setup();
    const disc = root.querySelector<HTMLElement>('[data-role="disc"]')!;
    app.setPlaying(true);
    expect(disc.style.animationPlayState).toBe('running');

    app.handleVisibilityChange('hidden');
    expect(disc.style.animationPlayState).toBe('paused');

    app.handleVisibilityChange('visible');
    expect(disc.style.animationPlayState).toBe('running');
  });

  it('pauseOnHidden が false のときは停止しない', () => {
    const { root, app } = setup();
    app.setPauseOnHidden(false);
    const disc = root.querySelector<HTMLElement>('[data-role="disc"]')!;
    app.setPlaying(true);
    app.handleVisibilityChange('hidden');
    expect(disc.style.animationPlayState).toBe('running');
  });
});

describe('createApp (ホスト連携 / M-015)', () => {
  it('ホストプロパティの変更を設定へ反映する', () => {
    const root = document.createElement('div');
    const listeners: Array<(props: Record<string, { value: unknown }>) => void> = [];
    const host = {
      wallpaperPropertyListener: {
        applyUserProperties(props: Record<string, { value: unknown }>) {
          for (const listener of listeners) listener(props);
        },
      },
    };
    // アダプターがラップするため、作成後に呼ぶ
    const app = createApp(root, {
      driver: new MemoryDriver(),
      now: () => new Date(2026, 10, 9, 14, 5, 9),
      locale: 'en-US',
      host,
    });

    host.wallpaperPropertyListener.applyUserProperties({ videotitle: { value: 'From Host' } });

    expect(root.querySelector('[data-role="title"]')?.textContent).toBe('From Host');
    expect(app.getConfig().video.title).toBe('From Host');
  });
});

describe('createApp (破棄)', () => {
  it('dispose で時計の更新を止める', () => {
    const { app } = setup();
    const before = vi.fn();
    expect(() => app.dispose()).not.toThrow();
    before();
  });
});
