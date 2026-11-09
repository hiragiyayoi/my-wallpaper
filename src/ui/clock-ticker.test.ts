import { describe, expect, it, vi } from 'vitest';
import { createClockTicker } from './clock-ticker.js';

function fakeTimers() {
  const queue: Array<{ at: number; fn: () => void; id: number }> = [];
  let now = 0;
  let nextId = 1;

  return {
    now: () => now,
    timers: {
      setTimeout: (fn: () => void, delay: number) => {
        const id = nextId++;
        queue.push({ at: now + delay, fn, id });
        return id;
      },
      clearTimeout: (id: number) => {
        const index = queue.findIndex((entry) => entry.id === id);
        if (index >= 0) queue.splice(index, 1);
      },
    },
    advance: (ms: number) => {
      now += ms;
      for (;;) {
        const due = queue.filter((entry) => entry.at <= now).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        queue.splice(queue.indexOf(due), 1);
        due.fn();
      }
    },
  };
}

describe('createClockTicker (F-003-2)', () => {
  it('start 直後に 1 回目を通知する', () => {
    const clock = fakeTimers();
    const onTick = vi.fn();
    const ticker = createClockTicker({
      onTick,
      now: () => new Date(2026, 10, 9, 14, 5, 9, 500),
      timers: clock.timers,
    });

    ticker.start();
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('次の秒境界で更新する (ドリフトしない)', () => {
    const clock = fakeTimers();
    const onTick = vi.fn();
    const ticker = createClockTicker({
      onTick,
      now: () => new Date(2026, 10, 9, 14, 5, 9, 500),
      timers: clock.timers,
    });

    ticker.start();
    clock.advance(499);
    expect(onTick).toHaveBeenCalledTimes(1);
    clock.advance(1);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('stop 後は通知しない', () => {
    const clock = fakeTimers();
    const onTick = vi.fn();
    const ticker = createClockTicker({
      onTick,
      now: () => new Date(2026, 10, 9, 14, 5, 9, 100),
      timers: clock.timers,
    });

    ticker.start();
    ticker.stop();
    clock.advance(3000);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('二重 start してもタイマーが増えない', () => {
    const clock = fakeTimers();
    const onTick = vi.fn();
    const ticker = createClockTicker({
      onTick,
      now: () => new Date(2026, 10, 9, 14, 5, 9, 100),
      timers: clock.timers,
    });

    ticker.start();
    ticker.start();
    clock.advance(1000);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('start し直せる (stop 後に start)', () => {
    const clock = fakeTimers();
    const onTick = vi.fn();
    const ticker = createClockTicker({
      onTick,
      now: () => new Date(2026, 10, 9, 14, 5, 9, 900),
      timers: clock.timers,
    });

    ticker.start();
    ticker.stop();
    ticker.start();
    expect(onTick).toHaveBeenCalledTimes(2);
  });
});
