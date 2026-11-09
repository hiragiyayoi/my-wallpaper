#!/usr/bin/env node
/**
 * Tier 2 フォールバック成果物の生成 (T-008 / UD-005)
 *
 * HTML を実行できないホスト (awww / mpvpaper / hyprpaper) 向けに、
 * ビルドした壁紙を静止画 PNG として書き出す。
 *
 * 使い方:
 *   node scripts/render-fallback.mjs
 *
 * 出力:
 *   dist/fallback/screenshot-1920x1080.png
 *   dist/fallback/screenshot-3840x2160.png
 *
 * 注意:
 *   Playwright は任意依存。インストールされていない場合はスキップし、
 *   終了コード 0 で終わる (ビルドを壊さない)。
 *   時計はレンダリング時点の時刻で焼き込まれる (UD-005 の暫定解)。
 */

import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const outDir = path.join(distDir, 'fallback');

const SIZES = [
  { width: 1920, height: 1080, name: 'screenshot-1920x1080.png' },
  { width: 3840, height: 2160, name: 'screenshot-3840x2160.png' },
];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    return null;
  }
}

async function main() {
  const indexPath = path.join(distDir, 'index.html');
  if (!(await exists(indexPath))) {
    console.error('dist/index.html がありません。先に `npm run build` を実行してください。');
    process.exitCode = 1;
    return;
  }

  const playwright = await loadPlaywright();
  if (!playwright) {
    console.warn(
      '[fallback] Playwright が見つかりません。スクリーンショット生成をスキップします。\n' +
        '          生成する場合: npm i -D playwright && npx playwright install chromium',
    );
    return;
  }

  await mkdir(outDir, { recursive: true });
  const browser = await playwright.chromium.launch();
  try {
    for (const size of SIZES) {
      const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
      await page.goto(pathToFileURL(indexPath).href);
      // 初回描画とフォント読み込みを待つ
      await page.waitForLoadState('networkidle');
      const target = path.join(outDir, size.name);
      await page.screenshot({ path: target });
      await page.close();
      console.log(`[fallback] ${path.relative(root, target)} を生成しました`);
    }
  } finally {
    await browser.close();
  }
}

await main();
