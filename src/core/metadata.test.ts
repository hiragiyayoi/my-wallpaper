import { describe, expect, it } from 'vitest';
import { titleFromFilename, resolveVideoMetadata } from './metadata.js';

describe('titleFromFilename (F-002-14 優先度3)', () => {
  it('拡張子を除去する', () => {
    expect(titleFromFilename('my-video.mp4')).toBe('my-video');
  });

  it('複数ドットの場合は最後の拡張子のみ除去する', () => {
    expect(titleFromFilename('mix.2026.final.webm')).toBe('mix.2026.final');
  });

  it('拡張子がない場合はそのまま返す', () => {
    expect(titleFromFilename('no-extension')).toBe('no-extension');
  });

  it('隠しファイル (.から始まる) は拡張子扱いしない', () => {
    expect(titleFromFilename('.hidden')).toBe('.hidden');
  });

  it('空文字は空文字を返す', () => {
    expect(titleFromFilename('')).toBe('');
  });
});

describe('resolveVideoMetadata (F-002-14)', () => {
  it('手入力がある場合は手入力値を使用する (優先度1)', () => {
    const result = resolveVideoMetadata({
      manual: { title: '手入力タイトル', creator: '手入力制作者' },
      embedded: { title: '埋め込みタイトル', creator: '埋め込み制作者' },
      filename: 'file.mp4',
    });
    expect(result).toEqual({ title: '手入力タイトル', creator: '手入力制作者' });
  });

  it('手入力がなく埋め込みメタデータがある場合は埋め込みを使用する (優先度2)', () => {
    const result = resolveVideoMetadata({
      embedded: { title: '埋め込みタイトル', creator: '埋め込み制作者' },
      filename: 'file.mp4',
    });
    expect(result).toEqual({ title: '埋め込みタイトル', creator: '埋め込み制作者' });
  });

  it('手入力も埋め込みもない場合はファイル名からタイトルを取り制作者は空 (優先度3)', () => {
    const result = resolveVideoMetadata({ filename: 'cool-set.mp4' });
    expect(result).toEqual({ title: 'cool-set', creator: '' });
  });

  it('空文字の手入力は未入力として扱う', () => {
    const result = resolveVideoMetadata({
      manual: { title: '', creator: '' },
      embedded: { title: '埋め込みタイトル', creator: '埋め込み制作者' },
      filename: 'file.mp4',
    });
    expect(result).toEqual({ title: '埋め込みタイトル', creator: '埋め込み制作者' });
  });

  it('タイトルは手入力・制作者は埋め込みと、フィールド単位で解決する', () => {
    const result = resolveVideoMetadata({
      manual: { title: '手入力タイトル' },
      embedded: { creator: '埋め込み制作者' },
      filename: 'file.mp4',
    });
    expect(result).toEqual({ title: '手入力タイトル', creator: '埋め込み制作者' });
  });

  it('埋め込みにタイトルがなく制作者だけある場合、タイトルはファイル名になる', () => {
    const result = resolveVideoMetadata({
      embedded: { creator: '埋め込み制作者' },
      filename: 'cool-set.mp4',
    });
    expect(result).toEqual({ title: 'cool-set', creator: '埋め込み制作者' });
  });

  it('すべて空の場合はタイトル・制作者ともに空', () => {
    expect(resolveVideoMetadata({ filename: '' })).toEqual({ title: '', creator: '' });
  });
});
