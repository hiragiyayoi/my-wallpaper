import { describe, expect, it } from 'vitest';
import { createClockView } from './clock-view.js';

describe('createClockView (F-003)', () => {
  it('時刻・日付・午前午後を描画する', () => {
    const root = document.createElement('div');
    const view = createClockView(root);
    view.setDisplay({ time: '14:05:09', date: '2026年11月9日', meridiem: 'PM' });

    expect(root.querySelector('[data-role="clock-time"]')?.textContent).toBe('14:05:09');
    expect(root.querySelector('[data-role="clock-date"]')?.textContent).toBe('2026年11月9日');
    expect(root.querySelector('[data-role="clock-meridiem"]')?.textContent).toBe('PM');
  });

  it('date が null のとき日付行を隠す (F-003-4)', () => {
    const root = document.createElement('div');
    const view = createClockView(root);
    view.setDisplay({ time: '14:05:09', date: null, meridiem: null });

    const date = root.querySelector<HTMLElement>('[data-role="clock-date"]');
    expect(date?.style.display).toBe('none');
  });

  it('meridiem が null のとき午前午後を隠す (F-003-3)', () => {
    const root = document.createElement('div');
    const view = createClockView(root);
    view.setDisplay({ time: '14:05:09', date: null, meridiem: null });

    const meridiem = root.querySelector<HTMLElement>('[data-role="clock-meridiem"]');
    expect(meridiem?.style.display).toBe('none');
  });

  it('日付行を表示に戻せる', () => {
    const root = document.createElement('div');
    const view = createClockView(root);
    view.setDisplay({ time: '00:00:00', date: null, meridiem: null });
    view.setDisplay({ time: '00:00:00', date: '2026年11月9日', meridiem: null });

    const date = root.querySelector<HTMLElement>('[data-role="clock-date"]');
    expect(date?.style.display).toBe('');
  });

  it('時刻は等幅表示用のクラスを持つ', () => {
    const root = document.createElement('div');
    createClockView(root);
    const time = root.querySelector<HTMLElement>('[data-role="clock-time"]');
    expect(time?.classList.contains('clock__time')).toBe(true);
  });
});
