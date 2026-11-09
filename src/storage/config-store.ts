/**
 * 設定・メディアの永続化 (F-001-5 / F-002-13 / F-005-2)
 *
 * UD-001 (保存先) は未決定だが、Tier 1 ホストでの標準的な実装として
 * IndexedDB を第一候補とし、利用できない環境ではメモリにフォールバックする。
 * 保存先の選択は差し替え可能な StorageDriver に閉じ込めている。
 */

import { normalizeConfig } from '../core/config.js';
import type { WallpaperConfig } from '../types.js';

export interface StorageDriver {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

const CONFIG_KEY = 'config';
const BACKGROUND_KEY = 'background';
const VIDEO_KEY = 'video';
const VIDEO_NAME_KEY = 'videoFileName';

/** 容量超過 (QuotaExceededError) を利用者向けに表現する例外 */
export class StorageQuotaError extends Error {
  constructor(message = 'ストレージの空き容量が不足しています。不要なデータを削除してください。') {
    super(message);
    this.name = 'StorageQuotaError';
  }
}

export function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const name = (error as { name?: unknown }).name;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

export interface CapacityEstimate {
  known: boolean;
  available?: number;
}

/** navigator.storage.estimate() による空き容量の事前確認 */
export async function estimateAvailable(): Promise<CapacityEstimate> {
  try {
    const storage = (navigator as { storage?: { estimate?: () => Promise<StorageEstimate> } })
      .storage;
    if (!storage || typeof storage.estimate !== 'function') return { known: false };
    const { quota, usage } = await storage.estimate();
    if (typeof quota !== 'number') return { known: false };
    return { known: true, available: quota - (usage ?? 0) };
  } catch {
    return { known: false };
  }
}

/** テスト・フォールバック用のメモリドライバ */
export class MemoryDriver implements StorageDriver {
  private readonly map = new Map<string, unknown>();

  async get(key: string): Promise<unknown> {
    return this.map.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async clear(): Promise<void> {
    this.map.clear();
  }
}

interface IdbDriverOptions {
  dbName?: string;
  storeName?: string;
}

/**
 * IndexedDB ドライバ。IndexedDB が利用できない場合は null を返し、
 * 呼び出し側が MemoryDriver にフォールバックする。
 */
export function createIdbDriver(options: IdbDriverOptions = {}): StorageDriver | null {
  const dbName = options.dbName ?? 'my-wallpaper';
  const storeName = options.storeName ?? 'kv';
  const factory = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  if (!factory) return null;
  const idb: IDBFactory = factory;

  let dbPromise: Promise<IDBDatabase> | null = null;

  function open(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = idb.open(dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    return dbPromise;
  }

  async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = fn(tx.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  }

  return {
    async get(key) {
      return run<unknown>('readonly', (store) => store.get(key));
    },
    async set(key, value) {
      await run('readwrite', (store) => store.put(value, key));
    },
    async delete(key) {
      await run('readwrite', (store) => store.delete(key));
    },
    async clear() {
      await run('readwrite', (store) => store.clear());
    },
  };
}

export interface LoadedState {
  config: WallpaperConfig;
  background: Blob | null;
  video: Blob | null;
  videoFileName: string;
}

function asBlob(value: unknown): Blob | null {
  return typeof Blob !== 'undefined' && value instanceof Blob ? value : null;
}

export class ConfigStore {
  constructor(private readonly driver: StorageDriver) {}

  private async write(key: string, value: unknown): Promise<void> {
    try {
      await this.driver.set(key, value);
    } catch (error) {
      if (isQuotaError(error)) throw new StorageQuotaError();
      throw error;
    }
  }

  async load(): Promise<LoadedState> {
    const [rawConfig, background, video, videoFileName] = await Promise.all([
      this.driver.get(CONFIG_KEY),
      this.driver.get(BACKGROUND_KEY),
      this.driver.get(VIDEO_KEY),
      this.driver.get(VIDEO_NAME_KEY),
    ]);

    return {
      config: normalizeConfig(rawConfig),
      background: asBlob(background),
      video: asBlob(video),
      videoFileName: typeof videoFileName === 'string' ? videoFileName : '',
    };
  }

  async save(config: WallpaperConfig): Promise<void> {
    await this.write(CONFIG_KEY, config);
  }

  async saveBackground(blob: Blob): Promise<void> {
    await this.write(BACKGROUND_KEY, blob);
  }

  async clearBackground(): Promise<void> {
    await this.driver.delete(BACKGROUND_KEY);
  }

  async saveVideo(blob: Blob, fileName: string): Promise<void> {
    await this.write(VIDEO_KEY, blob);
    await this.write(VIDEO_NAME_KEY, fileName);
  }

  async clearVideo(): Promise<void> {
    await this.driver.delete(VIDEO_KEY);
    await this.driver.delete(VIDEO_NAME_KEY);
  }
}
