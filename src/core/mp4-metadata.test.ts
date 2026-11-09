import { describe, expect, it } from 'vitest';
import { parseMp4Metadata } from './mp4-metadata.js';

/** テスト用に MP4 のアトム (box) を構築するヘルパ */
function box(type: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + payload.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, out.length);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(payload, 8);
  return out;
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** ilst の data box (type/locale 8 バイト + UTF-8 ペイロード) */
function dataBox(text: string): Uint8Array {
  const payload = new TextEncoder().encode(text);
  const out = new Uint8Array(8 + payload.length);
  out[3] = 1; // Well-known type: UTF-8
  out.set(payload, 8);
  return box('data', out);
}

function buildMp4(entries: Array<[string, string]>): Uint8Array {
  const items = entries.map(([type, value]) => box(type, dataBox(value)));
  const ilst = box('ilst', concat(...items));
  // meta は FullBox (version/flags 4 バイト) を先頭に持つ
  const meta = box('meta', concat(new Uint8Array([0, 0, 0, 0]), ilst));
  const udta = box('udta', meta);
  const moov = box('moov', udta);
  return concat(box('ftyp', new Uint8Array([0x69, 0x73, 0x6f, 0x6d])), moov);
}

describe('parseMp4Metadata', () => {
  it('©nam からタイトル、©ART から制作者名を取得する', () => {
    const mp4 = buildMp4([
      ['\u00A9nam', 'My Track'],
      ['\u00A9ART', 'DJ Someone'],
    ]);
    expect(parseMp4Metadata(mp4)).toEqual({
      title: 'My Track',
      creator: 'DJ Someone',
    });
  });

  it('タイトルのみの場合は creator を含めない', () => {
    const mp4 = buildMp4([['\u00A9nam', 'Only Title']]);
    expect(parseMp4Metadata(mp4)).toEqual({ title: 'Only Title' });
  });

  it('ilst がない場合は undefined を返す', () => {
    const mp4 = concat(
      box('ftyp', new Uint8Array([0x69, 0x73, 0x6f, 0x6d])),
      box('moov', box('mvhd', new Uint8Array(8))),
    );
    expect(parseMp4Metadata(mp4)).toBeUndefined();
  });

  it('空のデータは undefined を返す', () => {
    expect(parseMp4Metadata(new Uint8Array(0))).toBeUndefined();
  });

  it('切り詰められたデータでも例外を投げない', () => {
    const mp4 = buildMp4([['\u00A9nam', 'My Track']]);
    expect(() => parseMp4Metadata(mp4.slice(0, 20))).not.toThrow();
  });

  it('不正なサイズ指定のアトムでも無限ループしない', () => {
    const broken = new Uint8Array(16);
    const view = new DataView(broken.buffer);
    view.setUint32(0, 4); // ヘッダ (8) より小さい不正サイズ
    broken[4] = 'm'.charCodeAt(0);
    broken[5] = 'o'.charCodeAt(0);
    broken[6] = 'o'.charCodeAt(0);
    broken[7] = 'v'.charCodeAt(0);
    expect(parseMp4Metadata(broken)).toBeUndefined();
  });
});
