import { describe, expect, it, vi, afterEach } from 'vitest';
import { DEFAULT_CONFIG } from '../types.js';
import {
  ConfigStore,
  MemoryDriver,
  StorageQuotaError,
  estimateAvailable,
  isQuotaError,
  type StorageDriver,
} from './config-store.js';

class QuotaDriver implements StorageDriver {
  async get(): Promise<unknown> {
    return undefined;
  }
  async set(): Promise<void> {
    const error = new Error('quota') as Error & { name: string };
    error.name = 'QuotaExceededError';
    throw error;
  }
  async delete(): Promise<void> {}
  async clear(): Promise<void> {}
}

describe('ConfigStore', () => {
  it('保存した設定を復元する (F-005-2)', async () => {
    const store = new ConfigStore(new MemoryDriver());
    await store.save({ ...DEFAULT_CONFIG, overlayOpacity: 0.75 });
    const loaded = await store.load();
    expect(loaded.config.overlayOpacity).toBe(0.75);
  });

  it('未保存の場合はデフォルト設定を返す (F-005-3)', async () => {
    const store = new ConfigStore(new MemoryDriver());
    const loaded = await store.load();
    expect(loaded.config).toEqual(DEFAULT_CONFIG);
    expect(loaded.background).toBeNull();
    expect(loaded.video).toBeNull();
  });

  it('保存済みの背景画像 Blob を復元する (F-001-5)', async () => {
    const store = new ConfigStore(new MemoryDriver());
    const blob = new Blob(['image'], { type: 'image/png' });
    await store.saveBackground(blob);
    const loaded = await store.load();
    expect(loaded.background).toBeInstanceOf(Blob);
    expect(loaded.background?.size).toBe(blob.size);
  });

  it('保存済みの動画 Blob とファイル名を復元する (F-002-13)', async () => {
    const store = new ConfigStore(new MemoryDriver());
    const blob = new Blob(['video'], { type: 'video/webm' });
    await store.saveVideo(blob, 'set.webm');
    const loaded = await store.load();
    expect(loaded.video?.size).toBe(blob.size);
    expect(loaded.videoFileName).toBe('set.webm');
  });

  it('壊れた設定データはデフォルトにフォールバックする', async () => {
    const driver = new MemoryDriver();
    await driver.set('config', { overlayOpacity: 'broken', video: null });
    const store = new ConfigStore(driver);
    const loaded = await store.load();
    expect(loaded.config.overlayOpacity).toBe(0.4);
    expect(loaded.config.video.loop).toBe(true);
  });

  it('容量超過は StorageQuotaError として通知する', async () => {
    const store = new ConfigStore(new QuotaDriver());
    await expect(store.save(DEFAULT_CONFIG)).rejects.toBeInstanceOf(StorageQuotaError);
  });

  it('背景画像の削除ができる', async () => {
    const store = new ConfigStore(new MemoryDriver());
    await store.saveBackground(new Blob(['x']));
    await store.clearBackground();
    const loaded = await store.load();
    expect(loaded.background).toBeNull();
  });
});

describe('isQuotaError', () => {
  it('QuotaExceededError を判定する', () => {
    const error = new Error('x') as Error & { name: string };
    error.name = 'QuotaExceededError';
    expect(isQuotaError(error)).toBe(true);
  });

  it('その他のエラーは false', () => {
    expect(isQuotaError(new Error('x'))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });
});

describe('estimateAvailable', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Storage API がない環境では unknown を返す', async () => {
    vi.stubGlobal('navigator', {});
    const result = await estimateAvailable();
    expect(result.known).toBe(false);
  });

  it('quota と usage から空き容量を計算する', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: async () => ({ quota: 1000, usage: 400 }) },
    });
    const result = await estimateAvailable();
    expect(result).toEqual({ known: true, available: 600 });
  });

  it('estimate が失敗しても例外を投げない', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: async () => {
          throw new Error('denied');
        },
      },
    });
    const result = await estimateAvailable();
    expect(result.known).toBe(false);
  });
});
