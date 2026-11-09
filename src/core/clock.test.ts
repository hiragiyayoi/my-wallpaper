import { describe, expect, it } from 'vitest';
import { formatClock, nextSecondDelay } from './clock.js';

// ローカル時刻で構築する (タイムゾーンに依存しない)
const afternoon = new Date(2026, 10, 9, 14, 5, 9); // 2026-11-09 14:05:09 (月曜)
const midnight = new Date(2026, 10, 9, 0, 0, 0);

describe('formatClock (F-003)', () => {
  it('24時間表記で時分秒を表示する', () => {
    const display = formatClock(afternoon, { format: '24h', showDate: false, locale: 'en-US' });
    expect(display.time).toBe('14:05:09');
  });

  it('24時間表記の深夜0時は 00:00:00 になる (24:00:00 にならない)', () => {
    const display = formatClock(midnight, { format: '24h', showDate: false, locale: 'en-US' });
    expect(display.time).toBe('00:00:00');
  });

  it('12時間表記で午後の時刻に PM が付く', () => {
    const display = formatClock(afternoon, { format: '12h', showDate: false, locale: 'en-US' });
    expect(display.time).toContain('2:05:09');
    expect(display.meridiem).toBe('PM');
  });

  it('12時間表記で午前の時刻に AM が付く', () => {
    const display = formatClock(new Date(2026, 10, 9, 9, 30, 0), {
      format: '12h',
      showDate: false,
      locale: 'en-US',
    });
    expect(display.meridiem).toBe('AM');
  });

  it('24時間表記では meridiem が null', () => {
    const display = formatClock(afternoon, { format: '24h', showDate: false, locale: 'en-US' });
    expect(display.meridiem).toBeNull();
  });

  it('showDate が true の場合に日付と曜日を返す', () => {
    const display = formatClock(afternoon, { format: '24h', showDate: true, locale: 'en-US' });
    expect(display.date).toContain('2026');
    expect(display.date).toContain('November');
    expect(display.date).toContain('9');
    expect(display.date).toContain('Monday');
  });

  it('showDate が false の場合に date が null', () => {
    const display = formatClock(afternoon, { format: '24h', showDate: false, locale: 'en-US' });
    expect(display.date).toBeNull();
  });

  it('ロケールに応じた日付表記になる (F-003-5)', () => {
    const display = formatClock(afternoon, { format: '24h', showDate: true, locale: 'ja-JP' });
    expect(display.date).toContain('2026年');
    expect(display.date).toContain('11月');
  });

  it('12時間表記で午前/午後が時刻文字列に二重表示されない (F-003-3)', () => {
    const display = formatClock(afternoon, { format: '12h', showDate: false, locale: 'ja-JP' });
    expect(display.meridiem).toBe('午後');
    expect(display.time).not.toContain('午後');
    expect(display.time).toMatch(/^\d{1,2}:05:09$/);
  });
});

describe('nextSecondDelay', () => {
  it('次の秒境界までの待ち時間を返す', () => {
    expect(nextSecondDelay(new Date(2026, 10, 9, 14, 5, 9, 250))).toBe(750);
  });

  it('ちょうど秒境界の場合は 1000ms を返す (0 にしない)', () => {
    expect(nextSecondDelay(new Date(2026, 10, 9, 14, 5, 9, 0))).toBe(1000);
  });
});
