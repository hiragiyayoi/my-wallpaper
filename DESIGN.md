# DESIGN.md — 未承認ドラフト

> **注意: このドキュメントは「未承認ドラフト」です。**
> 要件定義 (REQUIREMENTS.md) で承認された要件に基づく内部設計の提案であり、
> 要件として承認されたものではありません。実装時に変更される可能性があります。

---

## 1. データモデル

### 1.1 WallpaperConfig インターフェース

```typescript
interface WallpaperConfig {
  // 背景画像
  backgroundImage: string | null;        // IndexedDB に保存された Blob の object URL (復元時に再生成)
  backgroundFit: 'cover';                // 固定値 (変更不可)
  overlayOpacity: number;                // 0.0 - 1.0, デフォルト 0.4

  // 動画
  video: {
    src: string | null;                 // IndexedDB に保存された Blob の object URL
    title: string;
    creator: string;
    loop: true;                         // 固定値
    muted: boolean;                     // デフォルト true
    volume: number;                     // 0.0 - 1.0, デフォルト 1.0
  };

  // 時計
  clock: {
    format: '12h' | '24h';             // デフォルト '24h'
    showDate: boolean;                  // デフォルト true
  };

  // パフォーマンス
  performance: {
    pauseOnHidden: boolean;            // デフォルト true
  };
}
```

### 1.2 変更履歴 (v1.0 → v2.0 → v2.2)
- v2.0: `backgroundImage`: "Base64 or object URL" → IndexedDB Blob の object URL のみ
- v2.0: `backgroundFit`: `'cover' | 'contain' | 'fill'` → `'cover'` 固定
- v2.0: `video.loop`: `boolean` → `true` 固定
- v2.0: `video.muted`: デフォルト `true` (自動再生制限対応)
- v2.0: `clock.showSeconds`: 削除 (秒表示は常時)
- v2.0: `performance.maxFps`: 削除 (ホスト側で制御)

---

## 2. 状態共有経路 (UD-001〜UD-004 に関連)

### 2.1 Wallpaper Engine
- ホストプロパティ (file/text/slider) で設定値を受信
- 背景画像・動画はホストの file property 経由でパスを取得し、IndexedDB にキャッシュ
- `window.wallpaperPropertyListener.applyUserProperties` で値を受信

### 2.2 Lively Wallpaper
- `livelyproperties.json` の値を Lively API で受信
- 背景画像・動画は IndexedDB に保存し、表示モードで復元

### 2.3 Plash (macOS)
- 設定ページと表示ページは同一オリジン (file:// または http://localhost)
- IndexedDB を共有。設定変更時は `BroadcastChannel` または `storage` イベントで表示モードに通知
- 別オリジンの場合は URL パラメータで設定値を伝達

### 2.4 Linux (awww/mpvpaper)
- 設定は CLI/設定ファイルで行う。表示モードは存在しない (Tier 2/3 はフォールバックのみ)

---

## 3. アダプターレイヤー

ホスト固有 API を隔離するモジュール群。`src/adapters/` ディレクトリに配置。

### 3.1 Wallpaper Engine アダプター
- `window.wallpaperPropertyListener` を feature detection で呼び出す
- `window.wallpaperRegisterAudioListener` で音声データを取得 (任意)
- `applyGeneralProperties` で FPS 制限を取得・適用

### 3.2 Lively Wallpaper アダプター
- Lively API (ハードウェア読み取り、音声グラフ) を feature detection で呼び出す

### 3.3 コアロジック
- 背景画像表示、動画再生、ターンテーブルアニメーション、時計は標準 Web API のみ使用
- ホスト固有 API への依存はアダプターレイヤーに限定

---

## 4. Tier 2 フォールバック処理

### 4.1 時計入りスクリーンショット PNG
- ビルド時に Tier 1 の HTML をヘッドレスブラウザ (Playwright) でレンダリングし、PNG を生成
- 時計部分はビルド時の時刻が焼き込まれる
- ビルドごとに 1 枚生成 (ランタイムでの再生成は行わない)

### 4.2 動画フォールバック
- IndexedDB 内のユーザ動画 Blob をエクスポートする CLI スクリプトを提供
- スクリプトは Blob をファイルに書き出し、mpvpaper のコマンドラインを生成

### 4.3 成果物の配置
- フォールバック成果物は `dist/fallback/` ディレクトリに配置

---

## 5. 例外処理の実装詳細

### 5.1 IndexedDB クォータ超過
- `QuotaExceededError` をキャッチし、ユーザーに通知する
- `navigator.storage.estimate()` で使用量を事前チェックする

### 5.2 自動再生制限
- 初期状態は `muted` で autoplay
- ユーザーが unmute ボタンを押すまでミュート

### 5.3 ファイルサイズ上限
- 背景画像: 50MB
- 動画: 500MB

---

## 6. モジュール構成 (提案)

```
src/
├── main.ts
├── components/
│   ├── BackgroundImage.ts
│   ├── Turntable.ts
│   └── Clock.ts
├── adapters/
│   ├── wallpaper-engine.ts
│   ├── lively.ts
│   └── plash.ts
├── storage/
│   └── IndexedDB.ts
└── styles/
    └── theme.css
```

---

## 7. F-002-14 詳細 (タイトル・制作者名の取得)

- 優先度 1 (手入力): ユーザーが設定 UI で入力した値を最優先で使用
- 優先度 2 (ファイル名): ファイル名から拡張子を除去したものを使用。制作者名は空文字
- 優先度 3 (埋め込みメタデータ): MP4 ファイルのメタデータタグをパースして使用。WebM には埋め込みメタデータがないため、ファイル名にフォールバック

---

## 8. 画面レイアウト (v1 §6 から復元)

```
┌──────────────────────────────────────────────────────────┐
│  [背景画像] + [半透明オーバーレイ]                       │
│                                                          │
│  ┌────────────────┐          ┌──────────────────────┐   │
│  │  🕐 CLOCK      │          │  🎵 TURNTABLE        │   │
│  │  12:34:56      │          │  ┌──────────────┐   │   │
│  │  2026-11-09    │          │  │   [VIDEO]    │   │   │
│  │  (Mon)         │          │  │  (回転中)     │   │   │
│  └────────────────┘          │  └──────────────┘   │   │
│                              │  Needle Arm ↗       │   │
│                              └──────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Title: "動画タイトル"                            │   │
│  │  By: "制作者名"                                  │   │
│  │  [▶ Play] [⏸ Pause] [🔊 ━━━━] [↻ Loop]          │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```
