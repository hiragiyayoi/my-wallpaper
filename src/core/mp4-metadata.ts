/**
 * MP4 (ISO BMFF) の埋め込みメタデータ読み取り (F-002-14 優先度2)
 *
 * 対象: moov > udta > meta > ilst > ©nam / ©ART の data box
 * このファイルは「タイトル・制作者名の取得元」を提供するだけで、
 * 取得できなかった場合は undefined を返す (呼び出し側でファイル名にフォールバックする)。
 */

import type { PartialVideoMetadata } from './metadata.js';

interface Atom {
  type: string;
  start: number;
  end: number;
}

const MAX_ATOM_DEPTH = 16;

function readType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );
}

/** 指定範囲の直下にあるアトムを列挙する (壊れたアトムに当たったら打ち切る) */
function* children(bytes: Uint8Array, start: number, end: number): Generator<Atom> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = start;
  const limit = Math.min(end, bytes.length);

  while (offset + 8 <= limit) {
    const size = view.getUint32(offset);
    const type = readType(bytes, offset + 4);

    let headerSize = 8;
    let atomSize = size;

    if (size === 1) {
      if (offset + 16 > limit) return;
      const high = view.getUint32(offset + 8);
      const low = view.getUint32(offset + 12);
      atomSize = high * 2 ** 32 + low;
      headerSize = 16;
    } else if (size === 0) {
      atomSize = limit - offset;
    }

    if (atomSize < headerSize || offset + atomSize > limit) return;

    yield { type, start: offset + headerSize, end: offset + atomSize };
    offset += atomSize;
  }
}

function find(bytes: Uint8Array, parent: Atom, type: string): Atom | undefined {
  for (const atom of children(bytes, parent.start, parent.end)) {
    if (atom.type === type) return atom;
  }
  return undefined;
}

/** data box から UTF-8 文字列を取り出す (先頭 8 バイトは type/locale) */
function readDataPayload(bytes: Uint8Array, data: Atom): string | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dataType = view.getUint32(data.start);
  // 1 = UTF-8, 2 = UTF-16, 0 = バイナリ。UTF-8 のみ扱う
  if (dataType !== 1) return undefined;
  const payloadStart = data.start + 8;
  if (payloadStart >= data.end) return undefined;
  const text = new TextDecoder('utf-8').decode(bytes.subarray(payloadStart, data.end));
  const trimmed = text.replace(/\0+$/, '').trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readIlstEntry(bytes: Uint8Array, ilst: Atom, type: string): string | undefined {
  const entry = find(bytes, ilst, type);
  if (!entry) return undefined;
  const data = find(bytes, entry, 'data');
  if (!data) return undefined;
  return readDataPayload(bytes, data);
}

/**
 * MP4 の埋め込みメタデータを読み取る。
 * 見つからなければ undefined。
 */
export function parseMp4Metadata(bytes: Uint8Array): PartialVideoMetadata | undefined {
  if (bytes.length < 8) return undefined;

  const root: Atom = { type: '', start: 0, end: bytes.length };
  const moov = find(bytes, root, 'moov');
  if (!moov) return undefined;

  const udta = find(bytes, moov, 'udta');
  if (!udta) return undefined;

  // meta は FullBox のため 4 バイトの version/flags を読み飛ばす
  const metaRaw = find(bytes, udta, 'meta');
  if (!metaRaw) return undefined;
  if (metaRaw.end - metaRaw.start < 4) return undefined;
  const meta: Atom = { type: 'meta', start: metaRaw.start + 4, end: metaRaw.end };

  const ilst = find(bytes, meta, 'ilst');
  if (!ilst) return undefined;

  const title = readIlstEntry(bytes, ilst, '\u00A9nam');
  const creator = readIlstEntry(bytes, ilst, '\u00A9ART');

  if (title === undefined && creator === undefined) return undefined;

  const result: PartialVideoMetadata = {};
  if (title !== undefined) result.title = title;
  if (creator !== undefined) result.creator = creator;
  return result;
}

/** 探索深さの上限 (将来の入れ子対応用にエクスポート) */
export const MP4_MAX_DEPTH = MAX_ATOM_DEPTH;
