/**
 * 時計の定期更新 (F-003-2)
 *
 * setInterval ではなく秒境界に合わせた setTimeout を使い、
 * 表示の更新が 1 秒ずつずれないようにする。
 * now / timers を注入可能にしてテストできるようにしている。
 */

import { nextSecondDelay } from '../core/clock.js';

export interface TickerTimers {
  setTimeout(handler: () => void, timeout: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface ClockTickerOptions {
  onTick: (now: Date) => void;
  now?: () => Date;
  timers?: TickerTimers;
}

export interface ClockTicker {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

const DEFAULT_TIMERS: TickerTimers = {
  setTimeout: (handler, timeout) => setTimeout(handler, timeout),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export function createClockTicker(options: ClockTickerOptions): ClockTicker {
  const now = options.now ?? (() => new Date());
  const timers = options.timers ?? DEFAULT_TIMERS;

  let handle: unknown = null;
  let running = false;
  let generation = 0;

  function schedule(): void {
    const current = now();
    const delay = nextSecondDelay(current);
    const myGeneration = generation;
    handle = timers.setTimeout(() => {
      if (!running || myGeneration !== generation) return;
      options.onTick(now());
      schedule();
    }, delay);
  }

  return {
    start() {
      if (running) return;
      running = true;
      generation += 1;
      options.onTick(now());
      schedule();
    },
    stop() {
      if (!running) return;
      running = false;
      generation += 1;
      if (handle !== null) {
        timers.clearTimeout(handle);
        handle = null;
      }
    },
    isRunning() {
      return running;
    },
  };
}
