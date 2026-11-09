import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '../types.js';
import { normalizeConfig } from './config.js';

describe('normalizeConfig (F-005)', () => {
  it('undefined はデフォルト設定を返す (F-005-3)', () => {
    expect(normalizeConfig(undefined)).toEqual(DEFAULT_CONFIG);
  });

  it('破損した値 (文字列・数値) でもデフォルトにフォールバックする', () => {
    expect(normalizeConfig('broken')).toEqual(DEFAULT_CONFIG);
    expect(normalizeConfig(42)).toEqual(DEFAULT_CONFIG);
    expect(normalizeConfig(null)).toEqual(DEFAULT_CONFIG);
  });

  it('部分的な設定をデフォルトにマージする', () => {
    const config = normalizeConfig({ overlayOpacity: 0.7 });
    expect(config.overlayOpacity).toBe(0.7);
    expect(config.video.volume).toBe(DEFAULT_CONFIG.video.volume);
    expect(config.clock.format).toBe(DEFAULT_CONFIG.clock.format);
  });

  it('backgroundFit は常に cover になる (F-005-4)', () => {
    const config = normalizeConfig({ backgroundFit: 'contain' });
    expect(config.backgroundFit).toBe('cover');
  });

  it('video.loop は常に true になる (F-005-5)', () => {
    const config = normalizeConfig({ video: { loop: false } });
    expect(config.video.loop).toBe(true);
  });

  it('video.muted の初期値は true (F-005-6)', () => {
    expect(normalizeConfig(undefined).video.muted).toBe(true);
    expect(normalizeConfig({ video: { muted: false } }).video.muted).toBe(false);
  });

  it('overlayOpacity は 0-1 に丸める', () => {
    expect(normalizeConfig({ overlayOpacity: -1 }).overlayOpacity).toBe(0);
    expect(normalizeConfig({ overlayOpacity: 9 }).overlayOpacity).toBe(1);
    expect(normalizeConfig({ overlayOpacity: 'x' }).overlayOpacity).toBe(0.4);
  });

  it('video.volume は 0-1 に丸める', () => {
    expect(normalizeConfig({ video: { volume: 5 } }).video.volume).toBe(1);
    expect(normalizeConfig({ video: { volume: -5 } }).video.volume).toBe(0);
  });

  it('clock.format は 12h / 24h 以外を受け付けない', () => {
    expect(normalizeConfig({ clock: { format: '12h' } }).clock.format).toBe('12h');
    expect(normalizeConfig({ clock: { format: '25h' } }).clock.format).toBe('24h');
  });

  it('文字列の title / creator はそのまま保持し、非文字列は空文字にする', () => {
    const config = normalizeConfig({ video: { title: 'T', creator: 5 } });
    expect(config.video.title).toBe('T');
    expect(config.video.creator).toBe('');
  });

  it('未知のキーは保持しない', () => {
    const config = normalizeConfig({ unknownKey: true }) as unknown as Record<string, unknown>;
    expect(config['unknownKey']).toBeUndefined();
  });

  it('すべての既定上限値が公開されている', () => {
    expect(MAX_IMAGE_BYTES).toBe(50 * 1024 * 1024);
    expect(MAX_VIDEO_BYTES).toBe(500 * 1024 * 1024);
  });
});
