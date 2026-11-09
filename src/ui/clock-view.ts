/**
 * 時計の表示 (F-003-6)
 *
 * 表示モードに置く時計パネル。値の計算は core/clock.ts、
 * 更新タイミングは ui/clock-ticker.ts が担当する。
 */

import type { ClockDisplay } from '../core/clock.js';

export interface ClockView {
  setDisplay(display: ClockDisplay): void;
}

export function createClockView(root: HTMLElement): ClockView {
  const section = document.createElement('section');
  section.className = 'clock';
  section.setAttribute('aria-label', '時計');

  // 掛け軸の表装: 上下の余白
  const scrollTop = document.createElement('div');
  scrollTop.className = 'clock__scroll-edge';
  scrollTop.dataset['role'] = 'clock-scroll-top';
  scrollTop.setAttribute('aria-hidden', 'true');

  const time = document.createElement('div');
  time.className = 'clock__time';
  time.dataset['role'] = 'clock-time';
  time.textContent = '--:--:--';

  const meridiem = document.createElement('span');
  meridiem.className = 'clock__meridiem';
  meridiem.dataset['role'] = 'clock-meridiem';
  meridiem.style.display = 'none';

  const date = document.createElement('div');
  date.className = 'clock__date';
  date.dataset['role'] = 'clock-date';
  date.style.display = 'none';

  const timeRow = document.createElement('div');
  timeRow.className = 'clock__time-row';
  timeRow.append(time, meridiem);

  const scrollBottom = document.createElement('div');
  scrollBottom.className = 'clock__scroll-edge clock__scroll-edge--bottom';
  scrollBottom.dataset['role'] = 'clock-scroll-bottom';
  scrollBottom.setAttribute('aria-hidden', 'true');

  section.append(scrollTop, timeRow, date, scrollBottom);
  root.append(section);

  return {
    setDisplay(display: ClockDisplay) {
      time.textContent = display.time;

      if (display.meridiem === null) {
        meridiem.style.display = 'none';
        meridiem.textContent = '';
      } else {
        meridiem.style.display = '';
        meridiem.textContent = display.meridiem;
      }

      if (display.date === null) {
        date.style.display = 'none';
        date.textContent = '';
      } else {
        date.style.display = '';
        date.textContent = display.date;
      }

      // 12/24 時間表記で数字の桁数が変わるため、data 属性で CSS を切り替える
      section.dataset['meridiem'] = display.meridiem === null ? 'none' : 'shown';
    },
  };
}
