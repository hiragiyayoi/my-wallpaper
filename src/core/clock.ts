/**
 * 時計表示のフォーマット (F-003)
 *
 * F-003-1: OS のシステム時計 (Date) を使用
 * F-003-3: 12時間 / 24時間表記の切替
 * F-003-4: 日付 (年月日・曜日) の表示
 * F-003-5: ロケールに応じたフォーマット
 */

import type { ClockFormat } from '../types.js';

export interface ClockFormatOptions {
  format: ClockFormat;
  showDate: boolean;
  /** 省略時は実行環境のロケール */
  locale?: string;
}

export interface ClockDisplay {
  time: string;
  date: string | null;
  meridiem: string | null;
}

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(key: string, create: () => Intl.DateTimeFormat): Intl.DateTimeFormat {
  const existing = cache.get(key);
  if (existing) return existing;
  const created = create();
  cache.set(key, created);
  return created;
}

function timeFormatter(locale: string | undefined, format: ClockFormat): Intl.DateTimeFormat {
  const hourCycle = format === '12h' ? 'h12' : 'h23';
  const key = `time|${locale ?? 'default'}|${hourCycle}`;
  return formatter(key, () =>
    new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle,
    }),
  );
}

function dateFormatter(locale: string | undefined): Intl.DateTimeFormat {
  const key = `date|${locale ?? 'default'}`;
  return formatter(key, () =>
    new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }),
  );
}

/** 現在時刻を表示用の文字列に変換する */
export function formatClock(date: Date, options: ClockFormatOptions): ClockDisplay {
  const formatter = timeFormatter(options.locale, options.format);
  const parts = formatter.formatToParts(date);

  // ロケールによっては 12 時間表記に午前/午後が埋め込まれるため、
  // 時分秒だけを取り出して組み立て、meridiem は別枠で返す (表示の二重化を防ぐ)
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  const second = parts.find((part) => part.type === 'second')?.value ?? '00';
  const time = `${hour}:${minute}:${second}`;

  const meridiem =
    options.format === '12h' ? (parts.find((part) => part.type === 'dayPeriod')?.value ?? null) : null;

  return {
    time,
    date: options.showDate ? dateFormatter(options.locale).format(date) : null,
    meridiem,
  };
}

/**
 * 次の秒境界までの待ち時間 (ms)。
 * setInterval のドリフトを避けて秒境界に更新を揃えるために使用する。
 */
export function nextSecondDelay(now: Date): number {
  const remainder = now.getMilliseconds();
  return remainder === 0 ? 1000 : 1000 - remainder;
}
