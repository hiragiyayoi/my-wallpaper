/**
 * エントリーポイント
 *
 * 表示モードで起動し、設定はホストのプロパティパネルまたは
 * 画面右下の「設定」ボタンから開く (M-003 / M-015〜M-017)。
 */

import './styles/theme.css';
import { createApp } from './app.js';

const root = document.getElementById('app');
if (!root) throw new Error('#app が見つかりません');

const app = createApp(root, {
  // 開発サーバーでは設定パネルを開いておくと確認しやすい
  openConfigOnStart: import.meta.env.DEV,
});

// NF-004: 非表示時はアニメーションを停止する
document.addEventListener('visibilitychange', () => {
  app.handleVisibilityChange(document.visibilityState === 'hidden' ? 'hidden' : 'visible');
});

// 設定パネルのキーボードショートカット (壁紙上で操作できないホストの補助)
window.addEventListener('keydown', (event) => {
  if (event.key === 's' || event.key === 'S') app.openConfig();
  if (event.key === 'Escape') app.closeConfig();
});

window.addEventListener('beforeunload', () => {
  app.dispose();
});

// テスト・デバッグ用 (本番でも参照可能)
declare global {
  interface Window {
    __wallpaper?: typeof app;
  }
}
window.__wallpaper = app;
