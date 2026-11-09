import { describe, expect, it, vi } from 'vitest';
import { createConfigPanel } from './config-panel.js';

function setup() {
  const root = document.createElement('div');
  const handlers = {
    onImageSelected: vi.fn(),
    onVideoSelected: vi.fn(),
    onTrackInfoChanged: vi.fn(),
    onClockFormatChanged: vi.fn(),
    onShowDateChanged: vi.fn(),
    onOverlayOpacityChanged: vi.fn(),
    onTogglePlay: vi.fn(),
    onSeek: vi.fn(),
    onVolumeChanged: vi.fn(),
    onUnmute: vi.fn(),
  };
  const panel = createConfigPanel(root, handlers);
  return { root, panel, handlers };
}

function setValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function click(button: HTMLElement): void {
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('createConfigPanel (設定・操作モード)', () => {
  it('画像選択・動画選択の入力を持つ (F-001-3 / F-002-12)', () => {
    const { root } = setup();
    expect(root.querySelector('[data-role="image-input"]')).not.toBeNull();
    expect(root.querySelector('[data-role="video-input"]')).not.toBeNull();
  });

  it('非表示にできる (表示モードでは出さない / M-001)', () => {
    const { panel } = setup();
    panel.setVisible(false);
    expect(panel.element.hidden).toBe(true);
    panel.setVisible(true);
    expect(panel.element.hidden).toBe(false);
  });

  it('タイトル・制作者名の編集を通知する (F-002-15)', () => {
    const { root, handlers } = setup();
    const title = root.querySelector<HTMLInputElement>('[data-role="title-input"]')!;
    const creator = root.querySelector<HTMLInputElement>('[data-role="creator-input"]')!;

    setValue(title, 'My Set');
    setValue(creator, 'DJ');

    expect(handlers.onTrackInfoChanged).toHaveBeenCalledWith({ title: 'My Set', creator: 'DJ' });
  });

  it('時計フォーマットの切替を通知する (F-003-3 / M-013)', () => {
    const { root, handlers } = setup();
    const select = root.querySelector<HTMLSelectElement>('[data-role="clock-format"]')!;
    select.value = '12h';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handlers.onClockFormatChanged).toHaveBeenCalledWith('12h');
  });

  it('日付表示の切替を通知する', () => {
    const { root, handlers } = setup();
    const checkbox = root.querySelector<HTMLInputElement>('[data-role="show-date"]')!;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handlers.onShowDateChanged).toHaveBeenCalledWith(false);
  });

  it('オーバーレイ透明度を通知する (M-014)', () => {
    const { root, handlers } = setup();
    const range = root.querySelector<HTMLInputElement>('[data-role="overlay-opacity"]')!;
    setValue(range, '0.8');
    expect(handlers.onOverlayOpacityChanged).toHaveBeenCalledWith(0.8);
  });

  it('再生/一時停止ボタンで通知する (F-002-8)', () => {
    const { root, handlers } = setup();
    click(root.querySelector<HTMLElement>('[data-role="toggle-play"]')!);
    expect(handlers.onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('シーク操作を通知する (F-002-8)', () => {
    const { root, panel, handlers } = setup();
    // 再生位置スライダーは動画の長さが分かってから有効になる
    panel.setSeek(0, 120);
    const range = root.querySelector<HTMLInputElement>('[data-role="seek"]')!;
    setValue(range, '12.5');
    expect(handlers.onSeek).toHaveBeenCalledWith(12.5);
  });

  it('再生位置スライダーは長さが未取得のとき 0 に固定される', () => {
    const { root, handlers } = setup();
    const range = root.querySelector<HTMLInputElement>('[data-role="seek"]')!;
    setValue(range, '12.5');
    expect(range.max).toBe('0');
    expect(handlers.onSeek).toHaveBeenCalledWith(0);
  });

  it('音量操作を通知する (F-002-10)', () => {
    const { root, handlers } = setup();
    const range = root.querySelector<HTMLInputElement>('[data-role="volume"]')!;
    setValue(range, '0.25');
    expect(handlers.onVolumeChanged).toHaveBeenCalledWith(0.25);
  });

  it('ミュート解除ボタンで通知する (自動再生制限対応)', () => {
    const { root, handlers } = setup();
    click(root.querySelector<HTMLElement>('[data-role="unmute"]')!);
    expect(handlers.onUnmute).toHaveBeenCalledTimes(1);
  });

  it('エラーメッセージを表示・クリアできる (例外処理)', () => {
    const { panel, root } = setup();
    panel.showError('対応していない形式です');
    const error = root.querySelector<HTMLElement>('[data-role="error"]')!;
    expect(error.textContent).toBe('対応していない形式です');
    expect(error.hidden).toBe(false);

    panel.showError(null);
    expect(error.hidden).toBe(true);
  });

  it('再生位置を反映する', () => {
    const { panel, root } = setup();
    panel.setSeek(30, 120);
    const seek = root.querySelector<HTMLInputElement>('[data-role="seek"]')!;
    expect(seek.value).toBe('30');
    expect(seek.max).toBe('120');
  });

  it('再生状態に応じてボタン表示を切り替える', () => {
    const { panel, root } = setup();
    const button = root.querySelector<HTMLElement>('[data-role="toggle-play"]')!;
    panel.setPlaying(true);
    expect(button.textContent).toContain('一時停止');
    panel.setPlaying(false);
    expect(button.textContent).toContain('再生');
  });

  it('ミュート状態に応じてボタン表示を切り替える', () => {
    const { panel, root } = setup();
    const button = root.querySelector<HTMLElement>('[data-role="unmute"]')!;
    panel.setMuted(true);
    expect(button.textContent).toContain('ミュート解除');
    panel.setMuted(false);
    expect(button.textContent).toContain('ミュート');
  });

  it('設定値を UI に反映する', () => {
    const { panel, root } = setup();
    panel.applyConfig({
      title: 'T',
      creator: 'C',
      clockFormat: '12h',
      showDate: false,
      overlayOpacity: 0.6,
      volume: 0.3,
    });

    expect(root.querySelector<HTMLInputElement>('[data-role="title-input"]')!.value).toBe('T');
    expect(root.querySelector<HTMLInputElement>('[data-role="creator-input"]')!.value).toBe('C');
    expect(root.querySelector<HTMLSelectElement>('[data-role="clock-format"]')!.value).toBe('12h');
    expect(root.querySelector<HTMLInputElement>('[data-role="show-date"]')!.checked).toBe(false);
    expect(root.querySelector<HTMLInputElement>('[data-role="overlay-opacity"]')!.value).toBe('0.6');
    expect(root.querySelector<HTMLInputElement>('[data-role="volume"]')!.value).toBe('0.3');
  });

  it('ドラッグ&ドロップで画像を受け付ける (F-001-4)', () => {
    const { root, handlers } = setup();
    const zone = root.querySelector<HTMLElement>('[data-role="drop-zone"]')!;
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const event = new Event('drop', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });

    zone.dispatchEvent(event);
    expect(handlers.onImageSelected).toHaveBeenCalledWith(file);
  });

  it('動画のドロップは動画ハンドラに渡す', () => {
    const { root, handlers } = setup();
    const zone = root.querySelector<HTMLElement>('[data-role="drop-zone"]')!;
    const file = new File(['x'], 'a.webm', { type: 'video/webm' });
    const event = new Event('drop', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });

    zone.dispatchEvent(event);
    expect(handlers.onVideoSelected).toHaveBeenCalledWith(file);
    expect(handlers.onImageSelected).not.toHaveBeenCalled();
  });

  it('複数ファイルのドロップでは最初の 1 件のみ扱う', () => {
    const { root, handlers } = setup();
    const zone = root.querySelector<HTMLElement>('[data-role="drop-zone"]')!;
    const files = [
      new File(['x'], 'a.png', { type: 'image/png' }),
      new File(['y'], 'b.png', { type: 'image/png' }),
    ];
    const event = new Event('drop', { bubbles: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files } });

    zone.dispatchEvent(event);
    expect(handlers.onImageSelected).toHaveBeenCalledTimes(1);
    expect((handlers.onImageSelected.mock.calls[0] as [File])[0].name).toBe('a.png');
  });
});
