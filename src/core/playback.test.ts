import { describe, expect, it } from 'vitest';
import {
  clampOpacity,
  clampVolume,
  discMotion,
  toneArmAngle,
  type PlaybackState,
} from './playback.js';

describe('discMotion (F-002-4 / F-002-5)', () => {
  it('再生中は running', () => {
    expect(discMotion('playing')).toBe('running');
  });

  it('一時停止中は paused', () => {
    expect(discMotion('paused')).toBe('paused');
  });

  it('待機中は paused', () => {
    expect(discMotion('idle')).toBe('paused');
  });

  it('読み込み中・エラー時も paused (誤って回り続けない)', () => {
    const others: PlaybackState[] = ['loading', 'error', 'ended'];
    for (const state of others) {
      expect(discMotion(state)).toBe('paused');
    }
  });
});

describe('toneArmAngle (F-002-11)', () => {
  it('再生中はレコード上 (0度)', () => {
    expect(toneArmAngle('playing')).toBe(0);
  });

  it('一時停止中もレコード上に留まる', () => {
    expect(toneArmAngle('paused')).toBe(0);
  });

  it('待機中は退避位置', () => {
    expect(toneArmAngle('idle')).toBeLessThan(0);
  });

  it('エラー時は退避位置', () => {
    expect(toneArmAngle('error')).toBeLessThan(0);
  });
});

describe('clampVolume (F-002-10)', () => {
  it('0-1 の範囲に収める', () => {
    expect(clampVolume(0.5)).toBe(0.5);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(2)).toBe(1);
  });

  it('NaN はデフォルト (1) にフォールバックする', () => {
    expect(clampVolume(Number.NaN)).toBe(1);
  });
});

describe('clampOpacity (F-001-7 / M-014)', () => {
  it('0-1 の範囲に収める', () => {
    expect(clampOpacity(0.4)).toBe(0.4);
    expect(clampOpacity(-0.5)).toBe(0);
    expect(clampOpacity(5)).toBe(1);
  });

  it('NaN はデフォルト (0.4) にフォールバックする', () => {
    expect(clampOpacity(Number.NaN)).toBe(0.4);
  });
});
