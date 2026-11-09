import { describe, expect, it, vi } from 'vitest';
import {
  createHostAdapter,
  detectHost,
  mapLivelyProperty,
  mapWallpaperEngineProperties,
  type ConfigPatch,
} from './host.js';

describe('detectHost (T-001〜T-003)', () => {
  it('wallpaperPropertyListener があれば wallpaper-engine', () => {
    expect(detectHost({ wallpaperPropertyListener: {} })).toBe('wallpaper-engine');
  });

  it('livelyPropertyListener があれば lively', () => {
    expect(detectHost({ livelyPropertyListener: () => {} })).toBe('lively');
  });

  it('どちらもなければ browser', () => {
    expect(detectHost({})).toBe('browser');
  });

  it('グローバルが壊れていても例外を投げない', () => {
    expect(() => detectHost(undefined)).not.toThrow();
  });
});

describe('mapWallpaperEngineProperties (M-015)', () => {
  it('ホストプロパティを設定へ写像する', () => {
    const patch = mapWallpaperEngineProperties({
      backgroundimage: { value: 'file:///C:/wall/bg.png' },
      overlayopacity: { value: 0.8 },
      videotitle: { value: 'My Set' },
      videocreator: { value: 'DJ' },
      clockformat: { value: '12h' },
      showdate: { value: false },
    });

    expect(patch.backgroundImage).toBe('file:///C:/wall/bg.png');
    expect(patch.overlayOpacity).toBe(0.8);
    expect(patch.video?.title).toBe('My Set');
    expect(patch.video?.creator).toBe('DJ');
    expect(patch.clock?.format).toBe('12h');
    expect(patch.clock?.showDate).toBe(false);
  });

  it('範囲外の値は丸める', () => {
    const patch = mapWallpaperEngineProperties({
      overlayopacity: { value: 5 },
      volume: { value: -1 },
    });
    expect(patch.overlayOpacity).toBe(1);
    expect(patch.video?.volume).toBe(0);
  });

  it('未知のプロパティは無視する', () => {
    const patch = mapWallpaperEngineProperties({ unknown: { value: 1 } });
    expect(Object.keys(patch)).toHaveLength(0);
  });

  it('空のファイルパスは null として扱う', () => {
    const patch = mapWallpaperEngineProperties({ backgroundimage: { value: '' } });
    expect(patch.backgroundImage).toBeNull();
  });
});

describe('mapLivelyProperty (M-016)', () => {
  it('camelCase のプロパティ名を設定へ写像する', () => {
    expect(mapLivelyProperty('overlayOpacity', 0.6)).toEqual({ overlayOpacity: 0.6 });
    expect(mapLivelyProperty('videoTitle', 'T')).toEqual({ video: { title: 'T' } });
    expect(mapLivelyProperty('clockFormat', '12h')).toEqual({ clock: { format: '12h' } });
  });

  it('未知のプロパティは空のパッチになる', () => {
    expect(mapLivelyProperty('nope', 1)).toEqual({});
  });
});

describe('createHostAdapter', () => {
  it('Wallpaper Engine のプロパティ変更を購読できる (M-015)', () => {
    const listeners: Array<(props: Record<string, { value: unknown }>) => void> = [];
    const win = {
      wallpaperPropertyListener: {
        applyUserProperties(props: Record<string, { value: unknown }>) {
          for (const listener of listeners) listener(props);
        },
      },
    };

    const adapter = createHostAdapter(win);
    expect(adapter.id).toBe('wallpaper-engine');

    const received: Array<ConfigPatch> = [];
    adapter.subscribe((patch) => received.push(patch));

    win.wallpaperPropertyListener.applyUserProperties({ videotitle: { value: 'X' } });

    expect(received).toHaveLength(1);
    expect(received[0]?.video?.title).toBe('X');
  });

  it('ホスト API がない場合は browser アダプターになり、購読しても何も起きない', () => {
    const adapter = createHostAdapter({});
    expect(adapter.id).toBe('browser');
    const callback = vi.fn();
    const unsubscribe = adapter.subscribe(callback);
    expect(() => unsubscribe()).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it('unsubscribe 後は通知されない', () => {
    const listeners: Array<(props: Record<string, { value: unknown }>) => void> = [];
    const win = {
      wallpaperPropertyListener: {
        applyUserProperties(props: Record<string, { value: unknown }>) {
          for (const listener of listeners) listener(props);
        },
      },
    };
    const adapter = createHostAdapter(win);
    const callback = vi.fn();
    const unsubscribe = adapter.subscribe(callback);
    unsubscribe();
    win.wallpaperPropertyListener.applyUserProperties({ videotitle: { value: 'X' } });
    expect(callback).not.toHaveBeenCalled();
  });
});
