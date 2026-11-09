/**
 * 設定・操作モードのパネル (M-005 / M-007 / M-008〜M-014 / F-002-15)
 *
 * 壁紙の表示モードとは分離した設定 UI。
 * 表示モードでは hidden にし、host のプロパティパネルや別ページから操作する。
 */

import type { ClockFormat } from '../types.js';

export interface TrackInfoValue {
  title: string;
  creator: string;
}

export interface ConfigPanelHandlers {
  onImageSelected(file: File): void;
  onVideoSelected(file: File): void;
  onTrackInfoChanged(info: TrackInfoValue): void;
  onClockFormatChanged(format: ClockFormat): void;
  onShowDateChanged(show: boolean): void;
  onOverlayOpacityChanged(opacity: number): void;
  onTogglePlay(): void;
  onSeek(seconds: number): void;
  onVolumeChanged(volume: number): void;
  onUnmute(): void;
  /** 設定パネルを閉じる (表示モードへ戻る) */
  onClose?(): void;
}

export interface ConfigPanelValues {
  title: string;
  creator: string;
  clockFormat: ClockFormat;
  showDate: boolean;
  overlayOpacity: number;
  volume: number;
}

export interface ConfigPanel {
  readonly element: HTMLElement;
  setVisible(visible: boolean): void;
  showError(message: string | null): void;
  setSeek(current: number, duration: number): void;
  setPlaying(playing: boolean): void;
  setMuted(muted: boolean): void;
  applyConfig(values: ConfigPanelValues): void;
}

function field(labelText: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'field';
  const span = document.createElement('span');
  span.className = 'field__label';
  span.textContent = labelText;
  label.append(span, control);
  return label;
}

function button(text: string, role: string): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = 'button';
  node.dataset['role'] = role;
  node.textContent = text;
  return node;
}

export function createConfigPanel(root: HTMLElement, handlers: ConfigPanelHandlers): ConfigPanel {
  const panel = document.createElement('section');
  panel.className = 'config-panel';
  panel.dataset['role'] = 'config-panel';
  panel.setAttribute('aria-label', '設定と操作');
  panel.hidden = true;

  const heading = document.createElement('h1');
  heading.className = 'config-panel__heading';
  heading.textContent = '和風DJ — 設定と操作';

  const error = document.createElement('p');
  error.className = 'config-panel__error';
  error.dataset['role'] = 'error';
  error.setAttribute('role', 'alert');
  error.hidden = true;

  // --- 背景画像 (F-001-3 / F-001-4) ---
  const imageInput = document.createElement('input');
  imageInput.type = 'file';
  imageInput.accept = 'image/jpeg,image/png,image/webp,image/gif';
  imageInput.dataset['role'] = 'image-input';
  imageInput.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (file) handlers.onImageSelected(file);
  });

  // --- 動画 (F-002-12) ---
  const videoInput = document.createElement('input');
  videoInput.type = 'file';
  videoInput.accept = 'video/mp4,video/webm,video/ogg';
  videoInput.dataset['role'] = 'video-input';
  videoInput.addEventListener('change', () => {
    const file = videoInput.files?.[0];
    if (file) handlers.onVideoSelected(file);
  });

  const dropZone = document.createElement('div');
  dropZone.className = 'drop-zone';
  dropZone.dataset['role'] = 'drop-zone';
  dropZone.textContent = '画像または動画をここに奉納';
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('drop-zone--active');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drop-zone--active');
  });
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('drop-zone--active');
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    if (file.type.startsWith('video/')) handlers.onVideoSelected(file);
    else handlers.onImageSelected(file);
  });

  // --- タイトル・制作者名 (F-002-15) ---
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.dataset['role'] = 'title-input';
  titleInput.placeholder = '動画タイトル';
  titleInput.maxLength = 200;

  const creatorInput = document.createElement('input');
  creatorInput.type = 'text';
  creatorInput.dataset['role'] = 'creator-input';
  creatorInput.placeholder = '制作者名';
  creatorInput.maxLength = 200;

  const emitTrackInfo = () => {
    handlers.onTrackInfoChanged({ title: titleInput.value, creator: creatorInput.value });
  };
  titleInput.addEventListener('input', emitTrackInfo);
  creatorInput.addEventListener('input', emitTrackInfo);

  // --- 時計 (F-003-3 / F-003-4) ---
  const clockFormat = document.createElement('select');
  clockFormat.dataset['role'] = 'clock-format';
  for (const [value, label] of [
    ['24h', '24時間'],
    ['12h', '12時間'],
  ] as const) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    clockFormat.append(option);
  }
  clockFormat.addEventListener('change', () => {
    handlers.onClockFormatChanged(clockFormat.value === '12h' ? '12h' : '24h');
  });

  const showDate = document.createElement('input');
  showDate.type = 'checkbox';
  showDate.dataset['role'] = 'show-date';
  showDate.addEventListener('change', () => handlers.onShowDateChanged(showDate.checked));

  // --- オーバーレイ (M-014) ---
  const overlayOpacity = document.createElement('input');
  overlayOpacity.type = 'range';
  overlayOpacity.min = '0';
  overlayOpacity.max = '1';
  overlayOpacity.step = '0.05';
  overlayOpacity.dataset['role'] = 'overlay-opacity';
  overlayOpacity.addEventListener('input', () => {
    handlers.onOverlayOpacityChanged(Number(overlayOpacity.value));
  });

  // --- 再生操作 (F-002-8 / F-002-10) ---
  const togglePlay = button('再生', 'toggle-play');
  togglePlay.addEventListener('click', () => handlers.onTogglePlay());

  const unmute = button('ミュート解除', 'unmute');
  unmute.addEventListener('click', () => handlers.onUnmute());

  const seek = document.createElement('input');
  seek.type = 'range';
  seek.min = '0';
  seek.max = '0';
  seek.step = '0.1';
  seek.value = '0';
  seek.dataset['role'] = 'seek';
  seek.addEventListener('input', () => handlers.onSeek(Number(seek.value)));

  const volume = document.createElement('input');
  volume.type = 'range';
  volume.min = '0';
  volume.max = '1';
  volume.step = '0.05';
  volume.value = '1';
  volume.dataset['role'] = 'volume';
  volume.addEventListener('input', () => handlers.onVolumeChanged(Number(volume.value)));

  const closeButton = button('閉じる', 'close');
  closeButton.addEventListener('click', () => handlers.onClose?.());

  const controls = document.createElement('div');
  controls.className = 'config-panel__actions';
  controls.append(togglePlay, unmute, closeButton);

  panel.append(
    heading,
    error,
    dropZone,
    field('背景画像', imageInput),
    field('動画', videoInput),
    field('タイトル', titleInput),
    field('制作者名', creatorInput),
    field('時計の表記', clockFormat),
    field('日付を表示', showDate),
    field('オーバーレイの濃さ', overlayOpacity),
    field('再生位置', seek),
    field('音量', volume),
    controls,
  );

  root.append(panel);

  return {
    element: panel,
    setVisible(visible: boolean) {
      panel.hidden = !visible;
    },
    showError(message: string | null) {
      if (message === null) {
        error.hidden = true;
        error.textContent = '';
        return;
      }
      error.hidden = false;
      error.textContent = message;
    },
    setSeek(current: number, duration: number) {
      const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
      seek.max = String(safeDuration);
      seek.value = String(Math.min(Math.max(0, current), safeDuration));
    },
    setPlaying(playing: boolean) {
      togglePlay.textContent = playing ? '一時停止' : '再生';
      panel.dataset['playing'] = playing ? 'true' : 'false';
    },
    setMuted(muted: boolean) {
      unmute.textContent = muted ? 'ミュート解除' : 'ミュート';
      panel.dataset['muted'] = muted ? 'true' : 'false';
    },
    applyConfig(values: ConfigPanelValues) {
      titleInput.value = values.title;
      creatorInput.value = values.creator;
      clockFormat.value = values.clockFormat;
      showDate.checked = values.showDate;
      overlayOpacity.value = String(values.overlayOpacity);
      volume.value = String(values.volume);
    },
  };
}
