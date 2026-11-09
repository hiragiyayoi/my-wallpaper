/**
 * 動画メタデータの解決 (F-002-14)
 *
 * 取得優先順位:
 *   1. ユーザー手入力 (存在する場合)
 *   2. 埋め込みメタデータ (存在する場合)
 *   3. ファイル名 (拡張子を除去。制作者名は空文字)
 *
 * 解決はフィールド単位で行う。つまり手入力でタイトルだけ指定した場合、
 * 制作者名は次の優先順位 (埋め込み → 空文字) にフォールバックする。
 */

export interface VideoMetadata {
  title: string;
  creator: string;
}

export interface PartialVideoMetadata {
  title?: string;
  creator?: string;
}

export interface MetadataCandidates {
  manual?: PartialVideoMetadata;
  embedded?: PartialVideoMetadata;
  filename: string;
}

/** 空文字・空白のみは「未入力」として扱う */
function present(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * ファイル名からタイトルを導出する。
 * 最後のドット以降を拡張子として除去する。ただし
 * 先頭がドットのみ (隠しファイル) の場合は拡張子とみなさない。
 */
export function titleFromFilename(filename: string): string {
  if (filename.length === 0) return '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) return filename;
  return filename.slice(0, lastDot);
}

function pick(...values: Array<string | undefined>): string {
  for (const value of values) {
    const found = present(value);
    if (found !== null) return found;
  }
  return '';
}

/** F-002-14: タイトルと制作者名を優先順位に従って解決する */
export function resolveVideoMetadata(candidates: MetadataCandidates): VideoMetadata {
  const { manual, embedded, filename } = candidates;
  return {
    title: pick(manual?.title, embedded?.title, titleFromFilename(filename)),
    creator: pick(manual?.creator, embedded?.creator),
  };
}
