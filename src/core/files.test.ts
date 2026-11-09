import { describe, expect, it } from 'vitest';
import { checkImageFile, checkVideoFile, videoFormatsForHost } from './files.js';

const MB = 1024 * 1024;

function file(name: string, type: string, size: number) {
  return { name, type, size };
}

describe('checkImageFile (F-001 例外処理)', () => {
  it('JPEG を受け付ける (F-001-1)', () => {
    expect(checkImageFile(file('a.jpg', 'image/jpeg', 1 * MB)).ok).toBe(true);
  });

  it('PNG を受け付ける (F-001-1)', () => {
    expect(checkImageFile(file('a.png', 'image/png', 1 * MB)).ok).toBe(true);
  });

  it('WebP / GIF を受け付ける (F-001-2)', () => {
    expect(checkImageFile(file('a.webp', 'image/webp', 1 * MB)).ok).toBe(true);
    expect(checkImageFile(file('a.gif', 'image/gif', 1 * MB)).ok).toBe(true);
  });

  it('BMP は拒否する', () => {
    const result = checkImageFile(file('a.bmp', 'image/bmp', 1 * MB));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unsupported-type');
  });

  it('MIME が空でも拡張子で判定する', () => {
    expect(checkImageFile(file('a.JPG', '', 1 * MB)).ok).toBe(true);
  });

  it('50MB を超えると拒否する', () => {
    const result = checkImageFile(file('a.png', 'image/png', 50 * MB + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('too-large');
  });

  it('ちょうど 50MB は許可する', () => {
    expect(checkImageFile(file('a.png', 'image/png', 50 * MB)).ok).toBe(true);
  });

  it('サイズ 0 は拒否する', () => {
    const result = checkImageFile(file('a.png', 'image/png', 0));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('empty');
  });

  it('拒否時は利用者向けメッセージを含む', () => {
    const result = checkImageFile(file('a.bmp', 'image/bmp', 1 * MB));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
  });
});

describe('videoFormatsForHost (F-002-1 / WE-006)', () => {
  it('Wallpaper Engine は webm/ogg/ogv のみ (WE-006: mp4 不使用)', () => {
    expect(videoFormatsForHost('wallpaper-engine')).toEqual(['webm', 'ogg', 'ogv']);
  });

  it('Lively は mp4 と webm を含む', () => {
    const formats = videoFormatsForHost('lively');
    expect(formats).toContain('mp4');
    expect(formats).toContain('webm');
  });

  it('Plash は mp4 / webm を含む', () => {
    const formats = videoFormatsForHost('plash');
    expect(formats).toContain('mp4');
    expect(formats).toContain('webm');
  });
});

describe('checkVideoFile (F-002 例外処理)', () => {
  it('Wallpaper Engine で webm を受け付ける', () => {
    expect(checkVideoFile(file('a.webm', 'video/webm', 10 * MB), 'wallpaper-engine').ok).toBe(true);
  });

  it('Wallpaper Engine で mp4 を拒否する', () => {
    const result = checkVideoFile(file('a.mp4', 'video/mp4', 10 * MB), 'wallpaper-engine');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unsupported-type');
    if (!result.ok) expect(result.message).toContain('webm');
  });

  it('Lively で mp4 を受け付ける', () => {
    expect(checkVideoFile(file('a.mp4', 'video/mp4', 10 * MB), 'lively').ok).toBe(true);
  });

  it('500MB を超えると拒否する', () => {
    const result = checkVideoFile(file('a.webm', 'video/webm', 500 * MB + 1), 'lively');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('too-large');
  });

  it('サイズ 0 は拒否する', () => {
    const result = checkVideoFile(file('a.webm', 'video/webm', 0), 'lively');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('empty');
  });

  it('未知の拡張子は拒否する', () => {
    const result = checkVideoFile(file('a.txt', 'text/plain', 1 * MB), 'lively');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unsupported-type');
  });
});
