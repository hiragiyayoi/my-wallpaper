/**
 * 入力ファイルの検証 (F-001 / F-002 の例外処理)
 *
 * 利用者に見える振る舞い:
 *  - 対応外形式は変更を拒否し、エラーメッセージを表示する
 *  - サイズ超過は警告を表示する
 */

import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type HostId } from '../types.js';

export type FileRejection = 'too-large' | 'unsupported-type' | 'empty';

export type FileCheck =
  | { ok: true }
  | { ok: false; reason: FileRejection; message: string };

export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export type VideoFormat = 'webm' | 'ogg' | 'ogv' | 'mp4' | 'm4v' | 'mov' | 'avi';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** F-002-1 / WE-006: ホストごとに対応する動画形式 */
const VIDEO_FORMATS: Record<HostId, VideoFormat[]> = {
  // WE-006: mp4 は使用しない
  'wallpaper-engine': ['webm', 'ogg', 'ogv'],
  lively: ['mp4', 'webm', 'mov', 'avi', 'm4v'],
  plash: ['mp4', 'webm', 'mov'],
  browser: ['mp4', 'webm', 'ogg', 'ogv', 'mov'],
};

const MIME_BY_FORMAT: Record<VideoFormat, string[]> = {
  webm: ['video/webm'],
  ogg: ['video/ogg', 'audio/ogg'],
  ogv: ['video/ogg'],
  mp4: ['video/mp4'],
  m4v: ['video/x-m4v', 'video/mp4'],
  mov: ['video/quicktime'],
  avi: ['video/x-msvideo', 'video/avi'],
};

export function extensionOf(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot < 0 || lastDot === filename.length - 1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

export function videoFormatsForHost(host: HostId): VideoFormat[] {
  return [...VIDEO_FORMATS[host]];
}

function tooLarge(kind: 'image' | 'video', limit: number): FileCheck {
  const limitMb = Math.round(limit / (1024 * 1024));
  return {
    ok: false,
    reason: 'too-large',
    message: `${kind === 'image' ? '画像' : '動画'}のサイズが上限 (${limitMb}MB) を超えています。`,
  };
}

function unsupported(kind: 'image' | 'video', accepted: string[]): FileCheck {
  return {
    ok: false,
    reason: 'unsupported-type',
    message: `${kind === 'image' ? '画像' : '動画'}の形式に対応していません。対応形式: ${accepted.join(' / ')}`,
  };
}

const EMPTY: FileCheck = {
  ok: false,
  reason: 'empty',
  message: 'ファイルが空です。別のファイルを選択してください。',
};

/** F-001-1 / F-001-2: 背景画像として受け付け可能か */
export function checkImageFile(file: FileLike): FileCheck {
  if (file.size === 0) return EMPTY;
  if (file.size > MAX_IMAGE_BYTES) return tooLarge('image', MAX_IMAGE_BYTES);

  const ext = extensionOf(file.name);
  const byMime = file.type !== '' && IMAGE_MIME_TYPES.includes(file.type);
  const byExt = IMAGE_EXTENSIONS.includes(ext);
  if (byMime || (file.type === '' && byExt)) return { ok: true };

  return unsupported('image', ['JPEG', 'PNG', 'WebP', 'GIF']);
}

/** F-002-1 / WE-006: 現在のホストで再生可能な動画か */
export function checkVideoFile(file: FileLike, host: HostId): FileCheck {
  if (file.size === 0) return EMPTY;
  if (file.size > MAX_VIDEO_BYTES) return tooLarge('video', MAX_VIDEO_BYTES);

  const formats = VIDEO_FORMATS[host];
  const ext = extensionOf(file.name) as VideoFormat | string;
  const byExt = (formats as string[]).includes(ext);
  const byMime = formats.some((format) => MIME_BY_FORMAT[format].includes(file.type));

  if (byExt || byMime) return { ok: true };

  return unsupported('video', formats);
}
