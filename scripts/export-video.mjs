#!/usr/bin/env node
/**
 * 動画フォールバック用の書き出し (T-008 / UD-006)
 *
 * IndexedDB に保存した動画 Blob はブラウザ内に閉じているため、
 * mpvpaper などに渡すにはファイルへ書き出す必要がある。
 *
 * 使い方:
 *   node scripts/export-video.mjs <input-video> [output-dir]
 *
 * 何をするか:
 *   1. 入力動画を output-dir (既定: dist/fallback) へコピーする
 *   2. mpvpaper で使うコマンド例を表示する
 *
 * 注意:
 *   IndexedDB から Blob を取り出す処理はブラウザ側にしか存在しないため、
 *   ユーザーが設定パネルから元の動画ファイルを指定して書き出す運用とする
 *   (UD-006 の暫定解)。
 */

import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const [, , input, outputDirArg] = process.argv;

if (!input) {
  console.error('使い方: node scripts/export-video.mjs <input-video> [output-dir]');
  process.exitCode = 1;
} else {
  const outDir = path.resolve(root, outputDirArg ?? 'dist/fallback');
  await mkdir(outDir, { recursive: true });
  const target = path.join(outDir, path.basename(input));
  await copyFile(input, target);

  console.log(`[export] ${path.relative(root, target)} を書き出しました`);
  console.log('');
  console.log('mpvpaper での表示例 (Linux / wlroots):');
  console.log(`  mpvpaper -o "no-audio --loop" '*' "${path.relative(root, target)}"`);
  console.log('');
  console.log('hyprpaper / awww で静止画を使う場合:');
  console.log('  awww img dist/fallback/screenshot-1920x1080.png');
}
